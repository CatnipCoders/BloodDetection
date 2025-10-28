import torch
import torchvision.models as models
from torchvision import transforms
from PIL import Image
import io

class BloodGroupPredictor:
    def __init__(self, model_path: str):
        # Load your trained model
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = models.resnet34(pretrained=False)
        # Adjust final layer for 8 blood groups
        self.model.fc = torch.nn.Linear(self.model.fc.in_features, 8)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        # Blood group mapping
        self.blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        
        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])
    
    def predict(self, image_bytes: bytes):
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Preprocess
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # Predict
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
        
        return {
            "blood_group": self.blood_groups[predicted.item()],
            "confidence": float(confidence.item()),
            "probabilities": {
                group: float(prob) 
                for group, prob in zip(self.blood_groups, probabilities[0].tolist())
            }
        }
