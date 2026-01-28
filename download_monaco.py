import os
import shutil
import urllib.request
import zipfile

def download_monaco_editor():
    print("Downloading Monaco Editor...")
    
    # Create lib directory if it doesn't exist
    lib_dir = os.path.join('frontend', 'lib')
    monaco_dir = os.path.join(lib_dir, 'monaco-editor')
    
    if not os.path.exists(lib_dir):
        os.makedirs(lib_dir)
    
    # Download URL for Monaco Editor
    monaco_url = "https://registry.npmjs.org/monaco-editor/-/monaco-editor-0.30.1.tgz"
    zip_path = os.path.join(lib_dir, "monaco-editor.tgz")
    
    # Download the file
    urllib.request.urlretrieve(monaco_url, zip_path)
    print("Download complete.")
    
    # Extract the package
    print("Extracting Monaco Editor...")
    
    # Create a temporary directory for extraction
    temp_dir = os.path.join(lib_dir, "temp")
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    
    # Extract the tgz file
    import tarfile
    with tarfile.open(zip_path, "r:gz") as tar:
        tar.extractall(temp_dir)
    
    # Move the min directory to the final location
    package_dir = os.path.join(temp_dir, "package")
    
    # Remove existing monaco-editor directory if it exists
    if os.path.exists(monaco_dir):
        shutil.rmtree(monaco_dir)
    
    # Create monaco-editor directory
    os.makedirs(monaco_dir)
    
    # Copy the min directory
    shutil.copytree(os.path.join(package_dir, "min"), os.path.join(monaco_dir, "min"))
    
    # Clean up
    shutil.rmtree(temp_dir)
    os.remove(zip_path)
    
    print("Monaco Editor has been installed successfully.")

if __name__ == "__main__":
    download_monaco_editor()