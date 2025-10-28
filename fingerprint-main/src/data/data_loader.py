import os
import glob
import pandas as pd
from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.resnet50 import preprocess_input

class DataLoader:
    def __init__(self, data_path='dataset_blood_group'):
        self.data_path = data_path
        self.name_class = os.listdir(data_path)
        
    def load_data(self):
        # Get file paths for all images in the dataset
        filepaths = list(glob.glob(self.data_path + '/**/*.*'))
        
        # Extract labels from file paths
        labels = list(map(lambda x: os.path.split(os.path.split(x)[0])[1], filepaths))
        
        # Create a DataFrame with file paths and labels
        filepath = pd.Series(filepaths, name='Filepath').astype(str)
        Labels = pd.Series(labels, name='Label')
        data = pd.concat([filepath, Labels], axis=1)
        data = data.sample(frac=1).reset_index(drop=True)
        
        return data
    
    def get_train_test_generators(self, data, img_size=(256, 256), batch_size=32):
        # Split data into training and testing sets
        train, test = train_test_split(data, test_size=0.20, random_state=42)
        
        # Set up ImageDataGenerator for training and validation data
        train_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
        test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
        
        train_gen = train_datagen.flow_from_dataframe(
            dataframe=train,
            x_col='Filepath',
            y_col='Label',
            target_size=img_size,
            class_mode='categorical',
            batch_size=batch_size,
            shuffle=True,
            seed=42
        )
        
        valid_gen = test_datagen.flow_from_dataframe(
            dataframe=test,
            x_col='Filepath',
            y_col='Label',
            target_size=img_size,
            class_mode='categorical',
            batch_size=batch_size,
            shuffle=False,
            seed=42
        )
        
        return train_gen, valid_gen, train, test