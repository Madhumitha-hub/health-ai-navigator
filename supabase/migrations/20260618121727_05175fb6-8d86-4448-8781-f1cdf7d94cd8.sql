
-- Models table: per-disease, per-algorithm trained model registry
CREATE TABLE IF NOT EXISTS public.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_type text NOT NULL CHECK (disease_type IN ('diabetes','heart','kidney','liver')),
  algorithm text NOT NULL CHECK (algorithm IN ('logistic_regression','random_forest','xgboost','svm','mlp')),
  version text NOT NULL DEFAULT 'v1',
  is_best boolean NOT NULL DEFAULT false,
  accuracy numeric(5,4),
  precision_score numeric(5,4),
  recall numeric(5,4),
  f1_score numeric(5,4),
  roc_auc numeric(5,4),
  cv_score numeric(5,4),
  confusion_matrix jsonb,
  feature_importance jsonb,
  trained_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (disease_type, algorithm, version)
);

GRANT SELECT ON public.models TO authenticated;
GRANT ALL ON public.models TO service_role;

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read models"
ON public.models FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage models"
ON public.models FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_models_touch ON public.models;
CREATE TRIGGER trg_models_touch BEFORE UPDATE ON public.models
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed: 4 diseases x 5 algorithms = 20 placeholder rows
INSERT INTO public.models (disease_type, algorithm, version, is_best, accuracy, precision_score, recall, f1_score, roc_auc, cv_score, confusion_matrix, feature_importance) VALUES
('diabetes','logistic_regression','v1', false, 0.7662, 0.7321, 0.6800, 0.7050, 0.8230, 0.7551, '{"tn":85,"fp":15,"fn":17,"tp":37}','{"Glucose":0.34,"BMI":0.21,"Age":0.14,"Insulin":0.11,"BloodPressure":0.08}'),
('diabetes','random_forest','v1', false, 0.7857, 0.7407, 0.7407, 0.7407, 0.8410, 0.7720, '{"tn":83,"fp":17,"fn":14,"tp":40}','{"Glucose":0.31,"BMI":0.22,"Age":0.15,"Insulin":0.12,"BloodPressure":0.09}'),
('diabetes','xgboost','v1', true,  0.8052, 0.7636, 0.7778, 0.7706, 0.8612, 0.7891, '{"tn":84,"fp":16,"fn":12,"tp":42}','{"Glucose":0.36,"BMI":0.20,"Age":0.13,"Insulin":0.11,"DiabetesPedigreeFunction":0.10}'),
('diabetes','svm','v1', false, 0.7727, 0.7407, 0.6800, 0.7100, 0.8190, 0.7610, '{"tn":85,"fp":15,"fn":17,"tp":37}','{"Glucose":0.30,"BMI":0.20,"Age":0.15,"Insulin":0.13,"BloodPressure":0.10}'),
('diabetes','mlp','v1', false, 0.7792, 0.7368, 0.7200, 0.7283, 0.8350, 0.7680, '{"tn":84,"fp":16,"fn":15,"tp":39}','{"Glucose":0.29,"BMI":0.22,"Age":0.14,"Insulin":0.12,"SkinThickness":0.09}'),

('heart','logistic_regression','v1', false, 0.8361, 0.8125, 0.8387, 0.8254, 0.8950, 0.8290, '{"tn":24,"fp":6,"fn":4,"tp":27}','{"ChestPainType":0.28,"MaxHR":0.18,"STDepression":0.15,"Cholesterol":0.12,"Age":0.10}'),
('heart','random_forest','v1', false, 0.8689, 0.8500, 0.8710, 0.8603, 0.9120, 0.8541, '{"tn":26,"fp":4,"fn":4,"tp":27}','{"ChestPainType":0.26,"MaxHR":0.20,"STDepression":0.17,"Cholesterol":0.11,"Age":0.09}'),
('heart','xgboost','v1', true,  0.8852, 0.8710, 0.8710, 0.8710, 0.9320, 0.8722, '{"tn":27,"fp":3,"fn":4,"tp":27}','{"ChestPainType":0.30,"STDepression":0.19,"MaxHR":0.16,"Cholesterol":0.10,"ExerciseAngina":0.09}'),
('heart','svm','v1', false, 0.8525, 0.8333, 0.8387, 0.8360, 0.8870, 0.8400, '{"tn":25,"fp":5,"fn":4,"tp":27}','{"ChestPainType":0.27,"MaxHR":0.19,"STDepression":0.14,"Age":0.11,"Cholesterol":0.10}'),
('heart','mlp','v1', false, 0.8525, 0.8276, 0.8485, 0.8379, 0.8980, 0.8421, '{"tn":25,"fp":5,"fn":4,"tp":27}','{"ChestPainType":0.25,"MaxHR":0.18,"STDepression":0.16,"Cholesterol":0.12,"RestingBP":0.10}'),

('kidney','logistic_regression','v1', false, 0.9500, 0.9474, 0.9474, 0.9474, 0.9810, 0.9420, '{"tn":23,"fp":1,"fn":1,"tp":15}','{"Hemoglobin":0.24,"SpecificGravity":0.20,"Albumin":0.17,"SerumCreatinine":0.14,"BloodUrea":0.10}'),
('kidney','random_forest','v1', true,  0.9875, 1.0000, 0.9688, 0.9841, 0.9952, 0.9810, '{"tn":24,"fp":0,"fn":1,"tp":15}','{"Hemoglobin":0.26,"PackedCellVolume":0.19,"SpecificGravity":0.18,"Albumin":0.14,"SerumCreatinine":0.12}'),
('kidney','xgboost','v1', false, 0.9750, 0.9474, 1.0000, 0.9730, 0.9930, 0.9760, '{"tn":23,"fp":1,"fn":0,"tp":16}','{"Hemoglobin":0.25,"SpecificGravity":0.19,"PackedCellVolume":0.18,"Albumin":0.13,"BloodUrea":0.11}'),
('kidney','svm','v1', false, 0.9625, 0.9444, 0.9688, 0.9565, 0.9870, 0.9540, '{"tn":23,"fp":1,"fn":1,"tp":15}','{"Hemoglobin":0.22,"SpecificGravity":0.20,"Albumin":0.17,"SerumCreatinine":0.13,"BloodGlucoseRandom":0.11}'),
('kidney','mlp','v1', false, 0.9625, 0.9412, 0.9412, 0.9412, 0.9820, 0.9560, '{"tn":23,"fp":1,"fn":1,"tp":15}','{"Hemoglobin":0.23,"SpecificGravity":0.18,"Albumin":0.16,"PackedCellVolume":0.14,"Age":0.10}'),

('liver','logistic_regression','v1', false, 0.7350, 0.7143, 0.6818, 0.6977, 0.7820, 0.7210, '{"tn":45,"fp":13,"fn":18,"tp":41}','{"TotalBilirubin":0.22,"DirectBilirubin":0.19,"SGPT":0.16,"SGOT":0.14,"AlkalinePhosphotase":0.11}'),
('liver','random_forest','v1', false, 0.7607, 0.7400, 0.7193, 0.7295, 0.8120, 0.7510, '{"tn":47,"fp":11,"fn":16,"tp":43}','{"TotalBilirubin":0.24,"SGPT":0.18,"DirectBilirubin":0.17,"SGOT":0.13,"AlkalinePhosphotase":0.10}'),
('liver','xgboost','v1', true,  0.7778, 0.7593, 0.7414, 0.7502, 0.8290, 0.7641, '{"tn":48,"fp":10,"fn":15,"tp":44}','{"TotalBilirubin":0.26,"SGPT":0.19,"DirectBilirubin":0.16,"SGOT":0.12,"AlbuminAndGlobulinRatio":0.10}'),
('liver','svm','v1', false, 0.7350, 0.7170, 0.6552, 0.6847, 0.7770, 0.7280, '{"tn":46,"fp":12,"fn":19,"tp":40}','{"TotalBilirubin":0.21,"DirectBilirubin":0.18,"SGPT":0.16,"Albumin":0.13,"Age":0.11}'),
('liver','mlp','v1', false, 0.7436, 0.7222, 0.6724, 0.6964, 0.7900, 0.7340, '{"tn":46,"fp":12,"fn":17,"tp":42}','{"TotalBilirubin":0.22,"SGPT":0.17,"DirectBilirubin":0.15,"SGOT":0.13,"TotalProteins":0.10}')
ON CONFLICT (disease_type, algorithm, version) DO NOTHING;
