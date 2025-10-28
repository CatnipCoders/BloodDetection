from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.applications import ResNet50

def create_resnet_model(input_shape=(256, 256, 3), num_classes=8):
    # Define the base pre-trained model
    pretrained_model = ResNet50(
        input_shape=input_shape,
        include_top=False,
        weights='imagenet',
        pooling='avg'
    )
    
    pretrained_model.trainable = False
    
    # Add layers for classification on top of ResNet50
    x = Dense(128, activation="relu")(pretrained_model.output)
    x = Dropout(0.3)(x)
    x = Dense(64, activation="relu")(x)
    x = Dropout(0.2)(x)
    outputs = Dense(num_classes, activation="softmax")(x)
    
    model = Model(inputs=pretrained_model.inputs, outputs=outputs)
    
    return model

def compile_model(model):
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model