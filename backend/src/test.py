from vertexai import init
from vertexai.generative_models import GenerativeModel

# init Vertex AI
init(
    project="project-3123573a-256e-4f73-9dd",
    location="us-central1",
)

# load Gemini model
model = GenerativeModel("gemini-2.5-pro")

# generate
response = model.generate_content("Hello Gemini, are you working?")
print(response.text)