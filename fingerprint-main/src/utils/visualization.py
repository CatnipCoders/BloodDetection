import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report

def plot_class_distribution(data):
    counts = data.Label.value_counts()
    plt.figure(figsize=(10, 6))
    sns.barplot(x=counts.index, y=counts)
    plt.xlabel('Blood Group')
    plt.ylabel('Count')
    plt.title('Distribution of Blood Groups')
    plt.xticks(rotation=90)
    plt.tight_layout()
    plt.show()

def plot_sample_images(data, num_rows=5, num_cols=3):
    fig, axes = plt.subplots(nrows=num_rows, ncols=num_cols, 
                            figsize=(10, 8), 
                            subplot_kw={'xticks': [], 'yticks': []})
    for i, ax in enumerate(axes.flat):
        if i < len(data):
            ax.imshow(plt.imread(data.Filepath.iloc[i]))
            ax.set_title(data.Label.iloc[i])
    plt.tight_layout()
    plt.show()

def plot_training_history(history):
    plt.figure(figsize=(12, 4))
    
    # Plot training & validation accuracy
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'])
    plt.plot(history.history['val_accuracy'])
    plt.title('Model accuracy')
    plt.ylabel('Accuracy')
    plt.xlabel('Epoch')
    plt.legend(['Train', 'Validation'], loc='upper left')
    
    # Plot training & validation loss
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'])
    plt.plot(history.history['val_loss'])
    plt.title('Model loss')
    plt.ylabel('Loss')
    plt.xlabel('Epoch')
    plt.legend(['Train', 'Validation'], loc='upper left')
    
    plt.tight_layout()
    plt.show()

def print_classification_metrics(y_true, y_pred, class_names):
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=class_names))