ZVEBILP ;VistA-Evolved billing probe;2026-02-20
 ;
 ; Probes VistA globals for billing/IB/PRCA/PCE/scheduling data
 ;
START ;
 W "=== VistA Billing Capability Probe ===",!
 ;
 ; -- 1. IB (Integrated Billing) globals --
 W !,"--- Integrated Billing (IB) ---",!
 ; File 350 - IB Action
 S X=$O(^IB(0))
 I X="" W "^IB(350) IB Action: EMPTY",! G IBACT
 S cnt=0 S ien="" F  S ien=$O(^IB(ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>5
 W "^IB(350) IB Action: ",cnt," entries (showing first if>0)",!
 I cnt>0 S ien=$O(^IB(0)) W "  Sample: ",ien,"=",$G(^IB(ien,0)),!
IBACT ;
 ; File 350.1 - IB Action Type
 S X=$O(^IBE(350.1,0))
 I X="" W "^IBE(350.1) IB Action Type: EMPTY",! G IBAT
 S cnt=0 S ien="" F  S ien=$O(^IBE(350.1,ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^IBE(350.1) IB Action Type: ",cnt," entries",!
IBAT ;
 ; File 399 - IB Claims Tracking
 S X=$O(^DGCR(399,0))
 I X="" W "^DGCR(399) IB Claims Tracking: EMPTY",! G IBCL
 S cnt=0 S ien="" F  S ien=$O(^DGCR(399,ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^DGCR(399) IB Claims Tracking: ",cnt," entries",!
 I cnt>0 S ien=$O(^DGCR(399,0)) W "  Sample 399: ",ien,"=",$G(^DGCR(399,ien,0)),!
IBCL ;
 ;
 ; -- 2. PRCA (Accounts Receivable) globals --
 W !,"--- Accounts Receivable (PRCA) ---",!
 ; File 430 - AR Transaction
 S X=$O(^PRCA(430,0))
 I X="" W "^PRCA(430) AR Transaction: EMPTY",! G ARTR
 S cnt=0 S ien="" F  S ien=$O(^PRCA(430,ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^PRCA(430) AR Transaction: ",cnt," entries",!
 I cnt>0 S ien=$O(^PRCA(430,0)) W "  Sample 430: ",ien,"=",$G(^PRCA(430,ien,0)),!
ARTR ;
 ; File 433 - AR Payment
 S X=$O(^PRCA(433,0))
 I X="" W "^PRCA(433) AR Payment: EMPTY",! G ARPAY
 S cnt=0 S ien="" F  S ien=$O(^PRCA(433,ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^PRCA(433) AR Payment: ",cnt," entries",!
ARPAY ;
 ;
 ; -- 3. PCE (Patient Care Encounter) globals --
 W !,"--- Patient Care Encounter (PCE) ---",!
 ; File 9000010 - Visit
 S X=$O(^AUPNVSIT(0))
 I X="" W "^AUPNVSIT Visit: EMPTY",! G VISIT
 S cnt=0 S ien="" F  S ien=$O(^AUPNVSIT(ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^AUPNVSIT(9000010) Visit: ",cnt," entries",!
 I cnt>0 S ien=$O(^AUPNVSIT(0)) W "  Sample Visit: ",ien,"=",$G(^AUPNVSIT(ien,0)),!
VISIT ;
 ; File 9000010.07 - V CPT
 S X=$O(^AUPNVCPT(0))
 I X="" W "^AUPNVCPT V CPT: EMPTY",! G VCPT
 S cnt=0 S ien="" F  S ien=$O(^AUPNVCPT(ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^AUPNVCPT(9000010.18) V CPT: ",cnt," entries",!
VCPT ;
 ; File 9000010.07 - V Diagnosis
 S X=$O(^AUPNVPOV(0))
 I X="" W "^AUPNVPOV V POV (Diagnosis): EMPTY",! G VPOV
 S cnt=0 S ien="" F  S ien=$O(^AUPNVPOV(ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^AUPNVPOV(9000010.07) V POV: ",cnt," entries",!
VPOV ;
 ;
 ; -- 4. Scheduling globals --
 W !,"--- Scheduling ---",!
 ; Check for appointment data
 S X=$O(^SC(0))
 I X="" W "^SC Hospital Location: EMPTY",! G SCHED
 S cnt=0 S ien="" F  S ien=$O(^SC(ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^SC(44) Hospital Location: ",cnt," entries",!
SCHED ;
 ;
 ; -- 5. Insurance globals --
 W !,"--- Insurance ---",!
 ; File 36 - Insurance Company
 S X=$O(^DIC(36,0))
 I X="" W "^DIC(36) Insurance Company: EMPTY",! G INS
 S cnt=0 S ien="" F  S ien=$O(^DIC(36,ien)) Q:ien=""  S cnt=cnt+1 Q:cnt>999
 W "^DIC(36) Insurance Company: ",cnt," entries",!
INS ;
 ; File 2.312 - Patient Insurance (sub-file of Patient #2)
 ; Check patient 3 as sample
 W "Patient 3 Insurance (^DPT(3,.312)): ",$S($D(^DPT(3,.312)):"EXISTS",$D(^DPT(3,.31)):"PARTIAL",1:"NONE"),!
 ;
 ; -- 6. Check key routines --
 W !,"--- Key Routines ---",!
 F RTN="IBRFN","IBCNSP","IBCNS","PRCAFN","PRCASER","ORWPCE","ORWPCE GETSVC","PXAPI" D
 . I $T(+0^@RTN)'="" W "Routine ",RTN,": EXISTS",! Q
 . W "Routine ",RTN,": NOT FOUND",!
 ;
 ; -- 7. Check billing RPCs in Option 19 --
 W !,"--- Billing-Related RPCs (Option 19 search) ---",!
 S cnt=0
 S ien="" F  S ien=$O(^XWB(8994,ien)) Q:ien=""  D
 . S nm=$P($G(^XWB(8994,ien,0)),"^",1) Q:nm=""
 . ; Match billing-related RPCs
 . I nm["IB "!(nm["PRCA ")!(nm["PRCAF")!(nm["ORWPCE")!(nm["DGCR")!(nm["IBD")!(nm["IBCN") D
 . . W "  RPC ",ien,": ",nm,!
 . . S cnt=cnt+1
 W "Total billing-related RPCs found: ",cnt,!
 ;
 ; -- 8. Encounter form context/RPCs --
 W !,"--- Encounter/PCE RPCs ---",!
 S ien="" F  S ien=$O(^XWB(8994,ien)) Q:ien=""  D
 . S nm=$P($G(^XWB(8994,ien,0)),"^",1) Q:nm=""
 . I nm["ORWPCE"!(nm["PXAPI")!(nm["SD ")!(nm["SDES ") W "  ",nm,!
 ;
 W !,"=== Probe Complete ==="
 Q
