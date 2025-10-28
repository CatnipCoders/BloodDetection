from src.data.data_loader import DataLoader
from src.models.resnet import create_resnet_model, compile_model
from src.utils.visualization import (
    plot_class_distribution,
    plot_sample_images,
    plot_training_history
)

def main():
    # Initialize data loader
    data_loader = DataLoader()
    data = data_loader.load_data()
    
    # Visualize data distribution
    plot_class_distribution(data)
    
    # Show sample images
    plot_sample_images(data)
    
    # Get data generators
    train_gen, valid_gen, train, test = data_loader.get_train_test_generators(data)
    
    # Create and compile model
    model = create_resnet_model(num_classes=len(data.Label.unique()))
    model = compile_model(model)
    
    # Train model
    history = model.fit(
        train_gen,
        validation_data=valid_gen,
        epochs=50,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True
            )
        ]
    )
    
    # Plot training history
    plot_training_history(history)
    
    # Save model
    model.save('models/blood_group_detection_model.h5')

if __name__ == "__main__":
    main()