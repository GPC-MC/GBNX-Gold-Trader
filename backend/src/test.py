from google import genai
from google.genai.types import HttpOptions

client = genai.Client(http_options=HttpOptions(api_version="v1"))
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="How does AI work?",
)
print(response.text)



# export GOOGLE_CLOUD_PROJECT=dulcet-order-476509-q4
# export GOOGLE_CLOUD_LOCATION=global
# export GOOGLE_GENAI_USE_VERTEXAI=True