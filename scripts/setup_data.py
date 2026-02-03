import os
import zipfile
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_kaggle():
    """Ensure Kaggle credentials are set up from .env if not already in system."""
    username = os.getenv("KAGGLE_USERNAME")
    key = os.getenv("KAGGLE_KEY")
    
    if username and key:
        os.environ['KAGGLE_USERNAME'] = username
        os.environ['KAGGLE_KEY'] = key
        print("Success: Kaggle credentials loaded from .env")
    else:
        print("Warning: KAGGLE_USERNAME or KAGGLE_KEY not found in .env. Falling back to default Kaggle config.")

def download_data():
    """Download the CERT r4.2 dataset using kaggle CLI."""
    # Primary slug from user, fallback to a known public one if 403/not found
    # Using more reliable public fallback: 'utkarshkanwat/certr42'
    datasets = ["lscert/cert-r42", "utkarshkanwat/certr42"]
    target_dir = os.path.abspath("backend/data/raw")
    
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        
    success = False
    downloaded_file = ""
    for dataset in datasets:
        print(f"Attempting to download {dataset} to {target_dir}...")
        try:
            subprocess.run(["kaggle", "datasets", "download", "-d", dataset, "-p", target_dir], check=True)
            success = True
            # The download command usually saves it as [slug-last-part].zip
            slug_part = dataset.split('/')[-1]
            downloaded_file = f"{slug_part}.zip"
            break
        except Exception as e:
            print(f"Failed to download {dataset}: {e}")
            
    if not success:
        print("Error: All download attempts failed.")
        return

    # Unzip the file
    zip_path = os.path.join(target_dir, downloaded_file)
    if os.path.exists(zip_path):
        print(f"Unzipping {zip_path}...")
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(target_dir)
            os.remove(zip_path)
            print("Successfully unzipped and cleaned up.")
        except Exception as e:
            print(f"Error unzipping {zip_path}: {e}")
    else:
        # Check if it downloaded multiple zips or files directly (Kaggle sometimes behaves differently)
        print("Specific zip not found, checking for any downloaded zip files...")
        for item in os.listdir(target_dir):
            if item.endswith(".zip"):
                print(f"Unzipping {item}...")
                try:
                    with zipfile.ZipFile(os.path.join(target_dir, item), 'r') as zip_ref:
                        zip_ref.extractall(target_dir)
                    os.remove(os.path.join(target_dir, item))
                except Exception as e:
                    print(f"Error unzipping {item}: {e}")

if __name__ == "__main__":
    setup_kaggle()
    download_data()
