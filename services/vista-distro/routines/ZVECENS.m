ZVECENS ;VistA-Evolved;Quick Census;
 ;; Counts key globals and writes results to /tmp/census.txt
 N X,Y,F
 S F="/tmp/census.txt"
 O F:(NEWVERSION) U F
 ;
 S X=0,Y="" F  S Y=$O(^DPT(Y)) Q:Y=""  S X=X+1
 W "Patients(2): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DIC(19,Y)) Q:Y=""  S X=X+1
 W "Options(19): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^XWB(8994,Y)) Q:Y=""  S X=X+1
 W "RPCs(8994): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DIC(4,Y)) Q:Y=""  S X=X+1
 W "Institutions(4): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^VA(200,Y)) Q:Y=""  S X=X+1
 W "Users(200): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^SC(Y)) Q:Y=""  S X=X+1
 W "Clinics(44): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DIC(42,Y)) Q:Y=""  S X=X+1
 W "Wards(42): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^PSDRUG(Y)) Q:Y=""  S X=X+1
 W "Drugs(50): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^GMR(120.82,Y)) Q:Y=""  S X=X+1
 W "AllergyReactants(120.82): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^ICD9(Y)) Q:Y=""  S X=X+1
 W "ICD-Codes: ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DIC(40.7,Y)) Q:Y=""  S X=X+1
 W "LabAccessionAreas(40.7): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^ORD(101,Y)) Q:Y=""  S X=X+1
 W "Protocols(101): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DIC(9.4,Y)) Q:Y=""  S X=X+1
 W "Packages(9.4): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DG(355.3,Y)) Q:Y=""  S X=X+1
 W "InsuranceCompanies(355.3): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^IB(350,Y)) Q:Y=""  S X=X+1
 W "IBActions(350): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DGCR(399,Y)) Q:Y=""  S X=X+1
 W "BillingClaims(399): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^AUPNVSIT(Y)) Q:Y=""  S X=X+1
 W "Visits(9000010): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^TIU(8925,Y)) Q:Y=""  S X=X+1
 W "TIUDocuments(8925): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^LR(Y)) Q:Y=""  S X=X+1
 W "LabResults(63): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^PSRX(Y)) Q:Y=""  S X=X+1
 W "Prescriptions(52): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^OR(100,Y)) Q:Y=""  S X=X+1
 W "Orders(100): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DIC(40.8,Y)) Q:Y=""  S X=X+1
 W "MedicalCenters(40.8): ",X,!
 ;
 S X=0,Y="" F  S Y=$O(^DIC(44,Y)) Q:Y=""  S X=X+1
 W "HospitalLocations(44): ",X,!
 ;
 C F
 Q
