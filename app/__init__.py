from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_jwt_extended.exceptions import NoAuthorizationError
from datetime import timedelta
from flask_jwt_extended import (
    JWTManager, create_access_token, set_access_cookies, unset_jwt_cookies, jwt_required, get_jwt_identity, verify_jwt_in_request
)
from connectors import connect_document_intelligence_service, connect_open_ai_service
from decorators import validate_uploaded_document, handle_exceptions
from werkzeug.security import generate_password_hash,check_password_hash
import random
import re
import json
import os
import random
from config import Config
import logging



from connectors import (
    connect_document_intelligence_service,
    connect_open_ai_chatbot,
    connect_open_ai_service,
    connect_language_services,
)
from decorators import (
    timing_decorator,
    validate_text_is_not_empty,
    validate_text_regenerating_input,
    validate_uploaded_document,
)
from dataBaseConnection import database 
from dotenv import load_dotenv
from openai import AzureOpenAI
from typing import Dict


app = Flask(__name__, template_folder='templates', static_folder='static')

# Configure your app's secret key and JWT settings
app.config['SECRET_KEY'] = 'WvWaVu42rrAFkB8ye2H5QViNWa8pW0kN6rM97YwYfv1OnAH5Q6R9zFWFdHrjjpJ'
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_ACCESS_COOKIE_PATH'] = '/'
app.config['JWT_COOKIE_SECURE'] = False  # Set to True for production with HTTPS
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=5)

# Initialize JWT Manager
jwt = JWTManager(app)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.context_processor
def inject_global_variables_into_templates() -> Dict:
    """
    Inject global variables into all templates.
    """
    return {"config": Config}


load_dotenv()


jwt = JWTManager(app)

# Access the 'users' collection from the database
users_collection = database['users']
# In-memory user storage
users = {
    "user1@example.com": generate_password_hash("P@ssw0rd!2024"),  # Example hashed password
    "user2@example.com": generate_password_hash("AnotherP@ssw0rd!2024")  # Example hashed password
}

def validate_signup_data(username, email, password):
    # Check if all fields are not empty
    if not username or not email or not password:
        return "All fields are required."
    # Username allows letters, numbers, underscores, and spaces, between 3-50 characters
    if not re.match(r"^[a-zA-Z0-9_ ]{3,50}$", username):
        return "Username must be 3-50 characters long and can include letters, numbers, underscores, and spaces."
    # Validate email format
    if not re.match(r"^[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$", email):
        return "Invalid email format."
    # Password must be at least 8 characters long and contain at least one digit, one uppercase letter, one lowercase letter, and one special character
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r"\d", password):
        return "Password must contain at least one number."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return "Password must contain at least one special character."
    return None

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'GET':
        logger.info("User accessed the sign-up page.")
        return render_template('registration.html')

    if request.method == 'POST':
        username = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')

        logger.info(f"Sign-up attempt with username: {username}, email: {email}")

        error = validate_signup_data(username, email, password)
        if error:
            logger.info(f"Validation error: {error}")
            return jsonify({'message': error}), 422

        # Check if the email already exists in the MongoDB collection
        existing_user = users_collection.find_one({'email': email})
        if existing_user:
            logger.info(f"Email already exists: {email}")
            return jsonify({'message': 'Email already exists'}), 422

        # Hash the password and insert the new user into the MongoDB collection
        hashed_password = generate_password_hash(password)
        new_user = {
            'username': username,
            'email': email,
            'password': hashed_password
        }
        users_collection.insert_one(new_user)

        logger.info(f"User {email} created successfully.")
        return jsonify({'message': 'User created successfully'}), 201

@app.route('/signin', methods=['GET', 'POST'])
def signin():
    if request.method == 'GET':
        logger.info("User accessed the Sign-in page.")
        return render_template('registration.html')

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        # Log received data for debugging
        logger.info(f"Received email: {email}")
        logger.info(f"Received password: {password}")

        # Fetch the user document from the MongoDB collection
        user = users_collection.find_one({'email': email})

        if not user:
            logger.warning(f"No user found with email: {email}")
            return jsonify({'login': False, 'message': 'No user found with the provided email.'}), 401

        # Check if the provided password matches the hashed password stored in the database
        if not check_password_hash(user['password'], password):
            logger.warning(f"Password mismatch for email: {email}")
            return jsonify({'login': False, 'message': 'Invalid credentials.'}), 401

        # Generate an access token
        expires = timedelta(minutes=5)
        access_token = create_access_token(identity=email, expires_delta=expires)
        logger.info(f"Generated token: {access_token}")

        # Create the response and set the access token in the cookies
        response = jsonify({'login': True, 'message': 'Signed in successfully.'})
        set_access_cookies(response, access_token)

        logger.info(f"User {email} signed in successfully.")
        return response
    
@app.route('/logout', methods=['POST'])
def logout():
    response = jsonify({'logout': True, 'message': 'Logged out successfully.'})
    unset_jwt_cookies(response)
    logger.info("User logged out and session ended.")
    return redirect(url_for('signin'))
    
@app.route('/')
def home():
    return render_template('homePage.html', commint="example")


@app.route('/generate-mind-map', methods=['POST'])
@validate_uploaded_document
def generat_new_mind_map():
    document = request.files.get("document")
    document_analysis_client = connect_document_intelligence_service()
    poller = document_analysis_client.begin_analyze_document(
        "prebuilt-document", document=document
    )
    result = poller.result()

    # Convert paragraphs to a list of dictionaries
    paragraphs = [p.to_dict() for p in result.paragraphs]

    # Create a dictionary to map section headings to their paragraphs
    paragraphs_dict = {}
    current_section_heading = None

    for paragraph in result.paragraphs:
        if paragraph.role == "title":
            # There should only be one title
            main_title = paragraph.content
        elif paragraph.role == "sectionHeading":
            # Save paragraphs for the previous section heading if it exists
            if (
                current_section_heading
                and current_section_heading not in paragraphs_dict
            ):
                paragraphs_dict[current_section_heading] = []
            # Update the current section heading
            current_section_heading = paragraph.content
            if current_section_heading not in paragraphs_dict:
                paragraphs_dict[current_section_heading] = []
        elif paragraph.role is None and current_section_heading:
            # Append paragraphs to the current section heading
            paragraphs_dict[current_section_heading].append(paragraph.content)
    output = {
        "mainTitle": main_title if "main_title" in locals() else "",
        "subtitles": [
            {
                "subtitle": section_heading,
                "paragraphs": paragraphs_dict.get(section_heading, []),
            }
            for section_heading in paragraphs_dict
        ],
    }
    
    return render_template('mindMap.html', output=output)

@app.route("/generate-summarization-image", methods=["POST"])
@handle_exceptions
@validate_text_is_not_empty("summary")
def generate_summarization_image() -> Dict[str, str]:
    """
    Generates an Image that describes summarized text using DallE-3 model.

    Returns:
    - A JSON object containing:
      - "message": A success message.
      - "url": The URL of the generated image.
    """
    summary = request.get_json().get('summary')

    client = connect_open_ai_service()

    result = client.images.generate(model="dall-e-3", prompt=summary, n=1)

    url = json.loads(result.model_dump_json())["data"][0]["url"]

    return {
        "message": "Image generated successfully.",
        "url": url,
    }, 201


@app.route('/mindMap')
def func():
    output = [
        {"key": "1", "name": "Department of Computer Engg. KGPTC Kozhikode"},
        {"key": "2", "parent": "1", "name": "Data Structure:"},
        {"key": "3", "parent": "1", "name": "TYPES OF DATA STRUCTURES"},
        {"key": "4", "parent": "1", "name": "1. Primitive and Non-Primitive Data Structure"},
        {"key": "5", "parent": "1", "name": "2. Linear and Non-Linear Data Structure"},
        {"key": "6", "parent": "1", "name": "3. Static and Dynamic Data Structure"},
        {"key": "7", "parent": "1", "name": "4. Sequential and Direct Data Structure"},
        {"key": "8", "parent": "1", "name": "OPERATIONS ON DATA STRUCTURE"},
        {"key": "9", "parent": "1", "name": "COMPLEXITY OF ALGORITHMS"},
        {"key": "10", "parent": "1", "name": "1. Time Complexity"},
        {"key": "11", "parent": "1", "name": "2. Space Complexity"},
        {"key": "12", "parent": "1", "name": "ASYMPTOTIC ANALYSIS"},
        {"key": "13", "parent": "1", "name": "Department of Computer Engg. KGPTC Kozhikode"},
        {"key": "14", "parent": "1", "name": "ASYMPTOTIC NOTATION"},
        {"key": "15", "parent": "1", "name": "STACK"}
    ]
    return render_template("mindMap.html", static=output)


@app.route("/regenerate-summarization-content")
@handle_exceptions
@validate_text_regenerating_input
def regenerate_summarization_content():
    """
    Regenerate and summarize summarized content using OpenAI

    This function uses OpenAI chatbot to regenerate and summarize summarized text
    by building new prompt, the inject the prompt into chatbot.
    """
    text = request.get_json().get("text")

    client = connect_open_ai_chatbot()

    prompt = (
        f"You are a genius chat bot, regenerate and summarize this text for me \n{text}"
    )

    response = client.completions.create(
        model=os.getenv("OPEN_AI_CHAT_DEBLOYMENT_NAME"),
        prompt=prompt,
        temperature=1,
        max_tokens=None,
        top_p=0.5,
        frequency_penalty=0,
        presence_penalty=0,
        best_of=1,
        stop=None,
    )

    return {
        "message": "Text summarized successfully.",
        "text": response.choices[0].text,
    }

@app.route("/summarized_text", methods=["POST"])
def summarized_text():
    paragraph = request.json.get("paragraph")   
    if not paragraph:
        return jsonify({'error': 'Invalid data'}), 400
    if len(paragraph.split()) < 35 or paragraph==None:
        return (
            jsonify({"error": "Invalid input: paragraph must be more that 35 words"}),
            422,
        )  
    text_analytics_client = connect_language_services()
    summarized_texts = []
    poller = text_analytics_client.begin_abstract_summary([paragraph])
    abstract_summary_results = poller.result()
    for result in abstract_summary_results:
        if result.kind == "AbstractiveSummarization":
            [summarized_texts.append(summary.text) for summary in result.summaries]
        elif result.is_error is True:
            print(
                "...Is an error with code '{}' and message '{}'".format(
                    result.error.code, result.error.message
                )
            )
    return jsonify({'summarization': summarized_texts[0]}), 200
# for viewing and testing 
@app.route("/error_page")
def error_page():
    return render_template('errorPage.html')


if __name__ == "__main__":
    app.run(debug=True)
