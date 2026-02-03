import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd

class BehavioralAutoencoder(nn.Module):
    """A Deep Autoencoder for modeling normal user behavioral patterns."""
    def __init__(self, input_dim):
        super(BehavioralAutoencoder, self).__init__()
        
        # Encoder: Compressing behavior into a latent bottleneck
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 4) # Latent space
        )
        
        # Decoder: Reconstructing the behavior from the bottleneck
        self.decoder = nn.Sequential(
            nn.Linear(4, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim)
        )
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.to(self.device)
        self.threshold = 0.0

    def forward(self, x):
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed

    def fit(self, X, epochs=20, batch_size=256, lr=0.001):
        if isinstance(X, pd.DataFrame):
            X = X.values
            
        # Standardize for the neural network
        self.mean = X.mean(axis=0)
        self.std = X.std(axis=0) + 1e-6 # Avoid division by zero
        X_scaled = (X - self.mean) / self.std
        
        dataset = TensorDataset(torch.FloatTensor(X_scaled).to(self.device))
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        criterion = nn.MSELoss()
        optimizer = optim.Adam(self.parameters(), lr=lr)
        
        print(f"Autoencoder: Training on {self.device}...")
        self.train()
        for epoch in range(epochs):
            total_loss = 0
            for batch in loader:
                inputs = batch[0]
                optimizer.zero_grad()
                outputs = self.forward(inputs)
                loss = criterion(outputs, inputs)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            
            if (epoch + 1) % 5 == 0:
                print(f"Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(loader):.6f}")
        
        # Calculate reconstruction error threshold (99th percentile)
        self.eval()
        with torch.no_grad():
            X_torch = torch.FloatTensor(X_scaled).to(self.device)
            preds = self.forward(X_torch)
            errors = torch.mean((preds - X_torch)**2, dim=1).cpu().numpy()
            self.threshold = np.percentile(errors, 99)
            print(f"Autoencoder: Training complete. Anomaly threshold set at {self.threshold:.6f}")

    def score_samples(self, X):
        """Returns reconstruction error (higher = more anomalous)."""
        self.eval()
        if isinstance(X, pd.DataFrame):
            X = X.values
        
        X_scaled = (X - self.mean) / self.std
        X_torch = torch.FloatTensor(X_scaled).to(self.device)
        
        with torch.no_grad():
            preds = self.forward(X_torch)
            errors = torch.mean((preds - X_torch)**2, dim=1).cpu().numpy()
            
        return errors

    def get_feature_importance(self, X):
        """Uses gradient of reconstruction error to identify contributing features."""
        if isinstance(X, pd.DataFrame):
            X = X.values
        
        X_scaled = (X - self.mean) / self.std
        X_torch = torch.FloatTensor(X_scaled).to(self.device)
        X_torch.requires_grad = True
        
        preds = self.forward(X_torch)
        loss = torch.mean((preds - X_torch)**2)
        loss.backward()
        
        importances = torch.abs(X_torch.grad).cpu().numpy()
        return importances / (importances.sum(axis=1, keepdims=True) + 1e-9)
