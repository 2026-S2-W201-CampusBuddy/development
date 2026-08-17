# This file is like a "Warehouse" where we keep our data
class FeatureModel:
    @staticmethod
    def get_all_features():
        # We save our list of features here
        # Later, this will come from a real Database
        return ["Campus Map", "Community Board", "Study Groups"]