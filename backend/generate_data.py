import pandas as pd
import numpy as np
import os

os.makedirs("data", exist_ok=True)

# Diabetes
n = 500
df = pd.DataFrame({
    "Age": np.random.randint(20, 80, n),
    "Gender": np.random.choice(["M", "F"], n),
    "BMI": np.random.uniform(18, 40, n),
    "Glucose": np.random.uniform(70, 200, n),
    "Insulin": np.random.uniform(15, 300, n),
    "BloodPressure": np.random.uniform(60, 180, n),
    "SkinThickness": np.random.uniform(10, 50, n),
    "DiabetesPedigreeFunction": np.random.uniform(0.1, 2.5, n),
    "Outcome": np.random.randint(0, 2, n)
})
df.to_csv("data/diabetes.csv", index=False)

# Heart
df = pd.DataFrame({
    "Age": np.random.randint(20, 85, n),
    "Gender": np.random.choice(["M", "F"], n),
    "ChestPainType": np.random.randint(0, 4, n),
    "RestingBP": np.random.randint(80, 200, n),
    "Cholesterol": np.random.randint(100, 400, n),
    "FastingBS": np.random.randint(0, 2, n),
    "RestingECG": np.random.randint(0, 3, n),
    "MaxHR": np.random.randint(60, 220, n),
    "ExerciseAngina": np.random.randint(0, 2, n),
    "STDepression": np.random.uniform(0, 6, n),
    "Outcome": np.random.randint(0, 2, n)
})
df.to_csv("data/heart.csv", index=False)

# Kidney
df = pd.DataFrame({
    "Age": np.random.randint(20, 85, n),
    "BloodPressure": np.random.randint(60, 180, n),
    "SpecificGravity": np.random.uniform(1.005, 1.030, n),
    "Albumin": np.random.randint(0, 6, n),
    "BloodGlucoseRandom": np.random.randint(70, 400, n),
    "BloodUrea": np.random.randint(10, 200, n),
    "SerumCreatinine": np.random.uniform(0.5, 15, n),
    "Hemoglobin": np.random.uniform(5, 18, n),
    "PackedCellVolume": np.random.randint(20, 55, n),
    "Outcome": np.random.randint(0, 2, n)
})
df.to_csv("data/kidney.csv", index=False)

# Liver
df = pd.DataFrame({
    "Age": np.random.randint(20, 85, n),
    "Gender": np.random.choice(["M", "F"], n),
    "TotalBilirubin": np.random.uniform(0.1, 15, n),
    "DirectBilirubin": np.random.uniform(0.0, 8, n),
    "AlkalinePhosphotase": np.random.randint(50, 500, n),
    "SGPT": np.random.randint(10, 300, n),
    "SGOT": np.random.randint(10, 300, n),
    "TotalProteins": np.random.uniform(4, 9, n),
    "Albumin": np.random.uniform(2, 6, n),
    "AlbuminAndGlobulinRatio": np.random.uniform(0.5, 2.5, n),
    "Outcome": np.random.randint(0, 2, n)
})
df.to_csv("data/liver.csv", index=False)

print("All datasets generated successfully!")