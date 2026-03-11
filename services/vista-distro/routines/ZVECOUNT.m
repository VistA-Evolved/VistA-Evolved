ZVECOUNT ;VE/KM - Quick census of VEHU VistA instance;2026-03-10
 ;;1.0;VistA-Evolved;**1**;;
 Q
EN ;
 W !,"=== VEHU VistA Census ==="
 W !
 ; Count FileMan files
 N FN,C S C=0,FN=0
 F  S FN=$O(^DIC(FN)) Q:FN'>0  S C=C+1
 W !,"FileMan files (^DIC): ",C
 ;
 ; Count DD entries
 N DD,D S D=0,DD=0
 F  S DD=$O(^DD(DD)) Q:DD'>0  S D=D+1
 W !,"DD file entries (^DD): ",D
 ;
 ; Count RPCs in File 8994
 N IEN,R S R=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  S R=R+1
 W !,"RPCs in File #8994: ",R
 ;
 ; Count Options in File 19
 N OPT,O S O=0,OPT=0
 F  S OPT=$O(^DIC(19,OPT)) Q:OPT'>0  S O=O+1
 W !,"Options in File #19: ",O
 ;
 ; Count patients in File 2
 N PAT,P S P=0,PAT=0
 F  S PAT=$O(^DPT(PAT)) Q:PAT'>0  S P=P+1
 W !,"Patients in File #2: ",P
 ;
 ; Count users in File 200
 N USR,U S U=0,USR=0
 F  S USR=$O(^VA(200,USR)) Q:USR'>0  S U=U+1
 W !,"Users in File #200: ",U
 ;
 ; Count clinics in File 44
 N CL,CLN S CLN=0,CL=0
 F  S CL=$O(^SC(CL)) Q:CL'>0  S CLN=CLN+1
 W !,"Clinics in File #44: ",CLN
 ;
 ; Count drugs in File 50
 N DR,DRG S DRG=0,DR=0
 F  S DR=$O(^PSDRUG(DR)) Q:DR'>0  S DRG=DRG+1
 W !,"Drugs in File #50: ",DRG
 ;
 ; Count lab tests in File 60
 N LT,LB S LB=0,LT=0
 F  S LT=$O(^LAB(60,LT)) Q:LT'>0  S LB=LB+1
 W !,"Lab tests in File #60: ",LB
 ;
 ; Count rad procedures File 71
 N RP,RD S RD=0,RP=0
 F  S RP=$O(^RAMIS(71,RP)) Q:RP'>0  S RD=RD+1
 W !,"Rad procs in File #71: ",RD
 ;
 ; Count wards File 42
 N WD,WC S WC=0,WD=0
 F  S WD=$O(^DIC(42,WD)) Q:WD'>0  S WC=WC+1
 W !,"Wards in File #42: ",WC
 ;
 ; Count IB globals
 N IB,IC S IC=0,IB=0
 F  S IB=$O(^IB(350,IB)) Q:IB'>0  S IC=IC+1
 W !,"IB charges (^IB(350)): ",IC
 ;
 ; Count AR
 N AR,AC S AC=0,AR=0
 F  S AR=$O(^PRCA(430,AR)) Q:AR'>0  S AC=AC+1
 W !,"AR trans (^PRCA(430)): ",AC
 ;
 ; Count insurance cos
 N INS,ISC S ISC=0,INS=0
 F  S INS=$O(^DIC(36,INS)) Q:INS'>0  S ISC=ISC+1
 W !,"Insurance cos File#36: ",ISC
 ;
 ; Count IFCAP (File 441)
 N IF,IFC S IFC=0,IF=0
 F  S IF=$O(^PRC(441,IF)) Q:IF'>0  S IFC=IFC+1
 W !,"IFCAP items (^PRC(441)): ",IFC
 ;
 ; Count Surgery (File 130)
 N SG,SGC S SGC=0,SG=0
 F  S SG=$O(^SRF(SG)) Q:SG'>0  S SGC=SGC+1
 W !,"Surgery cases (^SRF): ",SGC
 ;
 W !
 W !,"=== Census Complete ==="
 Q
