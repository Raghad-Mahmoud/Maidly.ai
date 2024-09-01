import functools
import re
import time

from dotenv import load_dotenv
from flask import Flask, jsonify, request

from config import Config


def validate_uploaded_document(func):
    """
    Validate uploaded document if it is exists, valid, and its mimetype is `application/pdf` which located on the body of request and its name is `document`
    """

    @functools.wraps(func)
    def validate(*args, **kwrgs):
        if "document" not in request.files:
            return {"message": "Request does not contain proper document."}, 422

        file = request.files.get("document")
        file_mimetype = file.mimetype

        if file_mimetype != "application/pdf":
            return {"message": f"{file_mimetype} extension is not supported."}, 422
        return func(*args, **kwrgs)

    return validate


def timing_decorator(func):
    """
    Count function execution time

    Returns:
    - Prints the execution time on in terminal in seconds.
    """

    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print(f"Execution time: {end_time - start_time} seconds")
        return result

    return wrapper


def validate_text_is_not_empty(text_input="text"):
    """
    Validate if text is not empty
    """

    def wrapper(func):
        @functools.wraps(func)
        def validate(*args, **kwrgs):
            text = request.get_json().get(text_input)

            text = text.strip()

            if text == "":
                return {"message": f"{text_input} text is invalid."}, 422

            return func(*args, **kwrgs)

        return validate

    return wrapper


def validate_text_regenerating_input(func):
    """
    Validate text that needs to be regenerated if it valid or not
    """

    def validate_regenerating_input(*args, **kwrgs):
        text = str(request.get_json().get("text"))

        text = text.strip()
        text = re.sub(r"\s+", " ", text)

        if text == "":
            return {"message": "Provided text is empty."}, 422
        if len(text.split()) < 20:
            return {"message": "Provided text is so smalle."}, 422

        return func(*args, **kwrgs)

    return validate_regenerating_input


def handle_exceptions(func):
    @functools.wraps(func)
    def wrapper(*args, **kwrgs):
        try:
            return func(*args, **kwrgs)
        except Exception as e:
            if Config.DEBUG:
                return jsonify({"message": f"Service Exception Message: {str(e)}"}), 500

            # TODO: Build error page.
            return jsonify({"message": "Service Exception."}), 500

    return wrapper
