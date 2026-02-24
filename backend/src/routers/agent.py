from fastapi import APIRouter, Depends, HTTPException
router = APIRouter(prefix="/agents", tags=["transactions"])


@router.post("/create")
async def create_agent(agent: Agent):
    prompt = """

        ====================================================
        WORKFLOW RULES
        ====================================================

        ✅ IF the question is SIMPLE:
        • Answer directly
        • DO NOT call the planning tool
        • DO NOT overthink or over-structure
        • Be concise and clear

        ⚠️ IF the question is COMPLEX:
        • You MUST follow the full workflow below

        ----------------------------------------------------
        COMPLEX QUESTION WORKFLOW (MANDATORY)
        ----------------------------------------------------

        STEP 1 - PLANNING:
        • FIRST call the `planning` tool with the user question
        • The planning tool defines the strategy and steps
        • DO NOT use any other tool before planning

        STEP 2 - EXECUTION:
        • Follow the plan strictly
        • Use the appropriate tools as outlined in the plan
        • Execute step by step

        STEP 3 - SYNTHESIS:
        • Analyze and combine gathered information
        • Produce a clear, structured, and helpful response

        ====================================================
        TOOL USAGE GUIDELINES
        ====================================================

        1. Planning Tool (planning)
        • REQUIRED ONLY for COMPLEX questions
        • NEVER use for simple questions


    """
    agent = GeneralChatAgent(system_prompt=SIMPLIFIED_GENERAL_CHAT_REACT_PROMPT, model_name="qwen-max")



@router.post("/ask_question")
async def ask_question(question: str):
    return {"message": "Question asked successfully"}
    
    