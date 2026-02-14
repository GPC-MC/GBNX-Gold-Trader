import time
from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_evals.evaluators import (
    EvaluationReason,
    Evaluator as EvalsEvaluator,
    EvaluatorContext,
)
from src.schemas.eval_schema import EvalInput, EvalOutput, EvalResult
from pydantic_evals.evaluators.common import LLMJudge

from src.app_config import app_config





class ChatEvalInput(BaseModel):
    question: str



DEFAULT_GROUNDEDNESS_RUBRIC = (
    "Does the output capture the meaning of the expected output? "
    "Ignore external facts. The output doesn't have to match exactly."
)


def _build_judge_model(model_name: Optional[str] = None) -> OpenAIChatModel:
    model_name = model_name or app_config.EVAL_LLM_MODEL_NAME

    provider = OpenAIProvider(
        api_key=app_config.LITE_LLM_API_KEY,
        base_url=app_config.LITE_LLM_ENDPOINT_URL,
    )
    return OpenAIChatModel(model_name, provider=provider)


def calculate_completion_rate(response: str) -> EvaluationReason:
    if not response or not response.strip():
        return EvaluationReason(value=0.0, reason="Empty response")
    if len(response.strip()) < 10:
        return EvaluationReason(value=0.5, reason="Very short response (<10 chars)")
    if any(c in response for c in ".!?"):
        return EvaluationReason(
            value=1.0, reason="Contains sentence-ending punctuation"
        )
    return EvaluationReason(
        value=0.75, reason="Non-empty response without sentence-ending punctuation"
    )


def _calculate_completion_rate(response: str) -> EvaluationReason:
    return calculate_completion_rate(response)


def _create_groundedness_judge(model: OpenAIChatModel, rubric: str) -> LLMJudge:
    return LLMJudge(
        rubric=rubric,
        model=model,
        include_input=True,
        include_expected_output=True,
        score={"include_reason": True, "evaluation_name": "groundedness_score"},
        assertion={"include_reason": True, "evaluation_name": "groundedness_pass"},
    )


def _build_judge_context(ctx: EvaluatorContext, output: str) -> EvaluatorContext:
    return EvaluatorContext(
        name=ctx.name,
        inputs=ctx.inputs,
        metadata=ctx.metadata,
        expected_output=ctx.expected_output,
        output=output,
        duration=ctx.duration,
        _span_tree=ctx._span_tree,
        attributes=ctx.attributes,
        metrics=ctx.metrics,
    )


def _ensure_reason(value: object) -> EvaluationReason:
    if isinstance(value, EvaluationReason):
        return value
    return EvaluationReason(value=value, reason=None)


async def _run_groundedness_judge(
    *,
    judge: LLMJudge,
    ctx: EvaluatorContext,
    output: str,
) -> dict[str, EvaluationReason]:
    try:
        result = await judge.evaluate(_build_judge_context(ctx, output))
        if isinstance(result, dict):
            return {name: _ensure_reason(value) for name, value in result.items()}
        return {"groundedness_score": _ensure_reason(result)}
    except Exception as error:
        failure = EvaluationReason(value=0.0, reason=f"Judge failed: {error}")
        return {
            "groundedness_score": failure,
            "groundedness_pass": EvaluationReason(value=False, reason=failure.reason),
        }


@dataclass
class Groundedness(EvalsEvaluator[EvalInput, str, None]):
    model: OpenAIChatModel | None = None
    rubric: str = DEFAULT_GROUNDEDNESS_RUBRIC
    judge: LLMJudge | None = None

    def __post_init__(self) -> None:
        if self.model is None:
            self.model = _build_judge_model()
        if self.judge is None:
            self.judge = _create_groundedness_judge(self.model, self.rubric)

    async def evaluate(
        self, ctx: EvaluatorContext[EvalInput, str, None]
    ) -> dict[str, EvaluationReason]:
        inputs = (
            ctx.inputs
            if isinstance(ctx.inputs, EvalInput)
            else EvalInput.model_validate(ctx.inputs)
        )
        expected = ctx.expected_output
        judge_context = EvaluatorContext(
            name=ctx.name,
            inputs=ChatEvalInput(question=inputs.question),
            metadata=ctx.metadata,
            expected_output=expected,
            output="",
            duration=ctx.duration,
            _span_tree=ctx._span_tree,
            attributes=ctx.attributes,
            metrics=ctx.metrics,
        )

        if expected is None:
            groundedness_response_1 = {
                "groundedness_score": EvaluationReason(
                    value=1.0, reason="No expected_output provided"
                ),
                "groundedness_pass": EvaluationReason(
                    value=True, reason="No expected_output provided"
                ),
            }
            groundedness_response_2 = {
                "groundedness_score": EvaluationReason(
                    value=1.0, reason="No expected_output provided"
                ),
                "groundedness_pass": EvaluationReason(
                    value=True, reason="No expected_output provided"
                ),
            }
        else:
            groundedness_response_1 = await _run_groundedness_judge(
                judge=self.judge,
                ctx=judge_context,
                output=inputs.llm_response_1,
            )
            groundedness_response_2 = await _run_groundedness_judge(
                judge=self.judge,
                ctx=judge_context,
                output=inputs.llm_response_2,
            )

        score_1 = _ensure_reason(groundedness_response_1.get("groundedness_score", 0.0))
        score_2 = _ensure_reason(groundedness_response_2.get("groundedness_score", 0.0))
        average_value = (float(score_1.value) + float(score_2.value)) / 2
        return {
            "groundedness_score_1": EvaluationReason(
                value=round(float(score_1.value), 2), reason=score_1.reason
            ),
            "groundedness_pass_1": groundedness_response_1.get(
                "groundedness_pass",
                EvaluationReason(value=False, reason="No pass result"),
            ),
            "groundedness_score_2": EvaluationReason(
                value=round(float(score_2.value), 2), reason=score_2.reason
            ),
            "groundedness_pass_2": groundedness_response_2.get(
                "groundedness_pass",
                EvaluationReason(value=False, reason="No pass result"),
            ),
            "groundedness_score_avg": EvaluationReason(
                value=round(average_value, 2),
                reason=(
                    "Average of response_1="
                    f"{float(score_1.value):.2f} and response_2="
                    f"{float(score_2.value):.2f}"
                ),
            ),
        }


@dataclass
class CompletionRate(EvalsEvaluator[EvalInput, str, None]):
    """Deterministic completion rate for both responses (score + reason)."""

    def evaluate(
        self, ctx: EvaluatorContext[EvalInput, str, None]
    ) -> dict[str, EvaluationReason]:
        inputs = (
            ctx.inputs
            if isinstance(ctx.inputs, EvalInput)
            else EvalInput.model_validate(ctx.inputs)
        )
        completion_rate_1 = _calculate_completion_rate(inputs.llm_response_1)
        completion_rate_2 = _calculate_completion_rate(inputs.llm_response_2)
        average_value = (
            float(completion_rate_1.value) + float(completion_rate_2.value)
        ) / 2
        return {
            "completion_rate_1": EvaluationReason(
                value=round(float(completion_rate_1.value), 2),
                reason=completion_rate_1.reason,
            ),
            "completion_rate_2": EvaluationReason(
                value=round(float(completion_rate_2.value), 2),
                reason=completion_rate_2.reason,
            ),
            "completion_rate_avg": EvaluationReason(
                value=round(average_value, 2),
                reason=(
                    "Average of response_1="
                    f"{float(completion_rate_1.value):.2f} and response_2="
                    f"{float(completion_rate_2.value):.2f}"
                ),
            ),
        }


@dataclass
class GroundednessSingle(EvalsEvaluator[ChatEvalInput, str, None]):
    """LLM judge: compare output to expected_output (score + reason)."""

    model: OpenAIChatModel | None = None
    rubric: str = DEFAULT_GROUNDEDNESS_RUBRIC
    judge: LLMJudge | None = None

    def __post_init__(self) -> None:
        if self.model is None:
            self.model = _build_judge_model()
        if self.judge is None:
            self.judge = _create_groundedness_judge(self.model, self.rubric)

    async def evaluate(
        self, ctx: EvaluatorContext[ChatEvalInput, str, None]
    ) -> dict[str, EvaluationReason]:
        inputs = (
            ctx.inputs
            if isinstance(ctx.inputs, ChatEvalInput)
            else ChatEvalInput.model_validate(ctx.inputs)
        )
        expected = ctx.expected_output
        if expected is None:
            return {
                "groundedness_score": EvaluationReason(
                    value=1.0, reason="No expected_output provided"
                ),
                "groundedness_pass": EvaluationReason(
                    value=True, reason="No expected_output provided"
                ),
            }

        groundedness_result = await _run_groundedness_judge(
            judge=self.judge,
            ctx=ctx,
            output=ctx.output,
        )
        return groundedness_result


@dataclass
class CompletionRateSingle(EvalsEvaluator[ChatEvalInput, str, None]):
    """Deterministic completion rate for a single output (score + reason)."""

    def evaluate(
        self, ctx: EvaluatorContext[ChatEvalInput, str, None]
    ) -> dict[str, EvaluationReason]:
        completion_rate = _calculate_completion_rate(ctx.output)
        return {
            "completion_rate": EvaluationReason(
                value=round(float(completion_rate.value), 2),
                reason=completion_rate.reason,
            )
        }


class Evaluator:
    """Backwards-compatible evaluator used by API routes."""

    def __init__(self, model: Optional[str] = None):
        self.model_name = model or app_config.EVAL_LLM_MODEL_NAME
        self.model: OpenAIChatModel | None = None
        self.rubric = DEFAULT_GROUNDEDNESS_RUBRIC
        self.judge: LLMJudge | None = None

    def _get_judge(self) -> LLMJudge:
        if self.judge is None:
            self.model = _build_judge_model(self.model_name)
            self.judge = _create_groundedness_judge(self.model, self.rubric)
        return self.judge

    async def evaluate(
        self, question: str, response: str, expected_output: Optional[str] = None
    ) -> EvalResult:
        start = time.time()

        if expected_output:
            context = EvaluatorContext(
                name=None,
                inputs=ChatEvalInput(question=question),
                metadata=None,
                expected_output=expected_output,
                output=response,
                duration=0.0,
                _span_tree=None,
                attributes={},
                metrics={},
            )
            groundedness_results = await _run_groundedness_judge(
                judge=self._get_judge(), ctx=context, output=response
            )
            groundedness_score = _ensure_reason(
                groundedness_results.get("groundedness_score", 0.0)
            )
            groundedness = float(groundedness_score.value)
            groundedness_reason = groundedness_score.reason
        else:
            groundedness = 1.0
            groundedness_reason = "No expected_output provided"

        completion_rate = _calculate_completion_rate(response)

        return EvalResult(
            groundedness=round(groundedness, 2),
            groundedness_reason=groundedness_reason,
            completion_rate=round(float(completion_rate.value), 2),
            completion_rate_reason=completion_rate.reason,
            running_time_ms=round((time.time() - start) * 1000, 2),
        )

    async def compare(
        self, data: EvalInput, expected_output: Optional[str] = None
    ) -> EvalOutput:
        r1 = await self.evaluate(data.question, data.llm_response_1, expected_output)
        r2 = await self.evaluate(data.question, data.llm_response_2, expected_output)

        return EvalOutput(response_1=r1, response_2=r2)
