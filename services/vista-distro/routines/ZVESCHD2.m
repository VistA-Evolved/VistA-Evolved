ZVESCHD2 ; VistA-Evolved Scheduling RPC Detail Probe ;2026-02-25
 ;;1.0;VistA-Evolved;**131**;2026-02-25;
 ;
 Q
 ;
EN ; Main entry - dump RPC definitions for key scheduling RPCs
 S U="^"
 W "=== Scheduling RPC Detail Probe ===",!
 ;
 ; Dump full definition for key RPCs
 D DUMPRPC(2206,"SDVW MAKE APPT API APP")
 D DUMPRPC(2207,"SDVW SDAPI APP")
 D DUMPRPC(222,"ORWPT APPTLST")
 D DUMPRPC(303,"ORWPT16 APPTLST")
 D DUMPRPC(881,"DVBAB APPOINTMENT LIST")
 D DUMPRPC(194,"ORQQVS VISITS/APPTS")
 D DUMPRPC(1294,"SD W/L CREATE FILE")
 D DUMPRPC(1312,"SD W/L CREATE DISPOSITION")
 D DUMPRPC(1313,"SD W/L CREATE M/R")
 D DUMPRPC(1295,"SD W/L RETRIVE BRIEF")
 D DUMPRPC(1305,"SD W/L PRIORITY(#409.3)")
 D DUMPRPC(1307,"SD W/L TYPE(409.3)")
 D DUMPRPC(1309,"SD W/L CURRENT STATUS(409.3)")
 ;
 ; Also check the M routine source for SDVW
 W !,"--- SDVWAPP source (first 40 lines) ---",!
 N L,I S I=0
 F  S L=$T(+I^SDVWAPP) Q:L=""  S I=I+1 Q:I>40  W I,": ",L,!
 ;
 W !,"=== Detail probe complete ===",!
 Q
 ;
DUMPRPC(IEN,LABEL) ;
 N ZN,RT,PARAMS
 S ZN=$G(^XWB(8994,IEN,0))
 W !,"--- ",LABEL," (IEN ",IEN,") ---",!
 W "  0 node: ",ZN,!
 W "  Name:   ",$P(ZN,U,1),!
 W "  Tag:    ",$P(ZN,U,2),!
 W "  RTN:    ",$P(ZN,U,3),!
 W "  RetType:",$P(ZN,U,4),!
 ;
 ; Dump parameter definitions (sub from 8994.02)
 N PI S PI=0
 W "  Params:",!
 F  S PI=$O(^XWB(8994,IEN,.1,PI)) Q:PI'>0  D
 . W "    P",PI,": ",$G(^XWB(8994,IEN,.1,PI,0)),!
 ;
 ; Also check .2 node for description
 I $D(^XWB(8994,IEN,.2)) D
 . W "  Desc: ",$G(^XWB(8994,IEN,.2,1,0)),!
 Q
