from training.common import load_csv, train_disease

if __name__ == "__main__":
    X, y = load_csv("liver.csv")
    train_disease("liver", X, y)
