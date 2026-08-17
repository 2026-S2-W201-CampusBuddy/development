# This file is like a "Chef" who handles the logic
from models.feature_model import FeatureModel

def get_features_logic():
    # 1. Ask the Model (Warehouse) for the data
    features = FeatureModel.get_all_features()
    
    # 2. Add a message and status to the data
    # This makes the data ready for the frontend
    return {
        "status": "success",
        "message": "Data retrieved using MVC Architecture",
        "data": features
    }

def greet_user_logic(name):
    # This function takes a name and returns a personalized greeting
    return {
        "status": "success",
        "message": f"Hello, {name}! Welcome to CampusBuddy.",
        "data": None
    }