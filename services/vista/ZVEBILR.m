ZVEBILR ;VistA-Evolved billing RPC probe;2026-02-20
 ;
START ;
 W "=== VistA Billing RPC Probe ===",!
 ;
 ; -- Search all RPCs for billing-related ones --
 W !,"--- All Billing/IB/PRCA/PCE RPCs ---",!
 S cnt=0
 S ien="" F  S ien=$O(^XWB(8994,ien)) Q:ien=""  D
 . S nm=$P($G(^XWB(8994,ien,0)),"^",1) Q:nm=""
 . I nm["IB"!(nm["PRCA")!(nm["ORWPCE")!(nm["DGCR")!(nm["PCE") D
 . . W "  ",ien,": ",nm,!
 . . S cnt=cnt+1
 W "Total: ",cnt,!
 ;
 ; -- SD/Scheduling RPCs --
 W !,"--- Scheduling RPCs ---",!
 S ien="" F  S ien=$O(^XWB(8994,ien)) Q:ien=""  D
 . S nm=$P($G(^XWB(8994,ien,0)),"^",1) Q:nm=""
 . I $E(nm,1,3)="SD "!($E(nm,1,5)="SDES ") W "  ",ien,": ",nm,!
 ;
 ; -- ORWPCE and encounter RPCs specifically --
 W !,"--- ORWPCE Encounter RPCs ---",!
 S ien="" F  S ien=$O(^XWB(8994,ien)) Q:ien=""  D
 . S nm=$P($G(^XWB(8994,ien,0)),"^",1) Q:nm=""
 . I $E(nm,1,6)="ORWPCE" W "  ",ien,": ",nm,!
 ;
 ; -- Check FileMan file definitions --
 W !,"--- FileMan File Definitions ---",!
 F FN=350,350.1,399,430,433,9000010 D
 . S hdr=$G(^DIC(FN,0))
 . W "File ",FN,": ",$S(hdr'="":$P(hdr,"^",1),1:"NOT DEFINED"),!
 ;
 ; -- Insurance file details --
 W !,"--- Insurance Companies ---",!
 S ien="" F  S ien=$O(^DIC(36,ien)) Q:ien=""  D
 . W "  ",ien,": ",$P($G(^DIC(36,ien,0)),"^",1),!
 ;
 ; -- Visit detail for patient 3 --
 W !,"--- Visits for Patient DFN=3 ---",!
 S cnt=0,ien="" F  S ien=$O(^AUPNVSIT(ien)) Q:ien=""  D  Q:cnt>10
 . S rec=$G(^AUPNVSIT(ien,0))
 . ; piece 5 = patient DFN in Visit file
 . S pat=$P(rec,"^",5)
 . I pat=3 W "  Visit ",ien,": date=",$P(rec,"^",1)," svc=",$P(rec,"^",8)," loc=",$P(rec,"^",22),! S cnt=cnt+1
 W "Patient 3 visits shown: ",cnt,!
 ;
 ; -- V CPT for patient 3 visits --
 W !,"--- V CPT (procedures) ---",!
 S cnt=0,ien="" F  S ien=$O(^AUPNVCPT(ien)) Q:ien=""  D  Q:cnt>10
 . S rec=$G(^AUPNVCPT(ien,0))
 . ; piece 3 = patient DFN
 . S pat=$P(rec,"^",3)
 . I pat=3 W "  CPT ",ien,": code=",$P(rec,"^",1)," visit=",$P(rec,"^",2)," prov=",$P(rec,"^",4),! S cnt=cnt+1
 ;
 ; -- V POV (diagnoses) for patient 3 --
 W !,"--- V POV (diagnoses) ---",!
 S cnt=0,ien="" F  S ien=$O(^AUPNVPOV(ien)) Q:ien=""  D  Q:cnt>10
 . S rec=$G(^AUPNVPOV(ien,0))
 . S pat=$P(rec,"^",3)
 . I pat=3 W "  POV ",ien,": code=",$P(rec,"^",1)," visit=",$P(rec,"^",2),! S cnt=cnt+1
 ;
 ; -- Hospital locations --
 W !,"--- Hospital Locations (^SC) ---",!
 S ien="" F  S ien=$O(^SC(ien)) Q:ien=""  D
 . W "  ",ien,": ",$P($G(^SC(ien,0)),"^",1)," type=",$P($G(^SC(ien,0)),"^",3),!
 ;
 W !,"=== RPC Probe Complete ==="
 Q
