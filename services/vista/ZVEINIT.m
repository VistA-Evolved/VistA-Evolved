ZVEINIT ;VE/KM - VistA-Evolved System Initialization;2026-03-10
 ;;1.0;VistA-Evolved;**1**;Mar 10, 2026;Build 1
 ;
 ; Purpose: Initializes a fresh VistA distro instance with system-level
 ;          configuration: Kernel params, RPC registration, security contexts.
 ;
 ; Entry points:
 ;   EN^ZVEINIT        - Full initialization pipeline
 ;   KERNEL^ZVEINIT    - Initialize Kernel parameters (File #8989.3)
 ;   RPCREG^ZVEINIT    - Register all ZVE* RPCs
 ;   CONTEXTS^ZVEINIT  - Set up RPC contexts (OR CPRS GUI CHART, etc.)
 ;   SITEPRM^ZVEINIT   - Set site parameters
 ;   VERIFY^ZVEINIT    - Verify initialization
 ;
 ; Called from: scripts/init-vista.sh (on first boot)
 ;
 Q
 ;
EN ; Full initialization pipeline
 W !,"=============================================="
 W !," VistA-Evolved System Initialization"
 W !,"=============================================="
 ;
 D KERNEL
 D SITEPRM
 D RPCREG
 D CONTEXTS
 ;
 W !,!,"=============================================="
 W !," Initialization Complete"
 W !,"=============================================="
 D VERIFY
 Q
 ;
KERNEL ; Initialize Kernel parameters
 W !,!,"--- Kernel Parameters (File #8989.3) ---"
 ;
 ; Find the Kernel System Parameters entry
 N IEN S IEN=$O(^XTV(8989.3,0))
 I IEN'>0 D
 . ; Create entry if it doesn't exist
 . S IEN=1
 . S ^XTV(8989.3,0)="KERNEL SYSTEM PARAMETERS^1^1"
 . S ^XTV(8989.3,1,0)="KERNEL SYSTEM PARAMETERS"
 ;
 W !,"  Kernel params IEN: "_IEN
 ;
 ; Set RPC Broker listener port in parameters
 ; Field 14 = LISTENER PORT (this is the standard Kernel field)
 S $P(^XTV(8989.3,IEN,0),"^",14)=9430
 W !,"  Set RPC Broker port: 9430"
 ;
 ; Enable auto-menu building
 W !,"  Kernel parameters configured."
 Q
 ;
SITEPRM ; Set site parameters
 W !,!,"--- Site Parameters ---"
 ;
 ; Verify institution exists in File #4
 N INSTIEN,CNT S CNT=0,INSTIEN=0
 F  S INSTIEN=$O(^DIC(4,INSTIEN)) Q:INSTIEN'>0  S CNT=CNT+1
 W !,"  Institutions in File #4: "_CNT
 ;
 ; Check if the main Kernel site file has an institution
 N KSP S KSP=$O(^XTV(8989.3,0))
 I KSP>0 D
 . N INST S INST=$P($G(^XTV(8989.3,KSP,0)),"^",1)
 . W !,"  Kernel site name: "_INST
 Q
 ;
RPCREG ; Register all custom RPCs from ZVE* routines
 W !,!,"--- Registering VistA-Evolved RPCs ---"
 ;
 ; Call each routine's install/registration entry point
 N RTNS,I,RTN,TAG
 ;
 ; List of routines with their registration entry points
 ; Format: ROUTINE^TAG
 F I=1:1 S RTN=$P($T(RTNLIST+I),";;",2) Q:RTN="END"  D
 . S TAG=$P(RTN,"^",2)
 . S RTN=$P(RTN,"^",1)
 . I '$L($T(@(TAG_"^"_RTN))) D  Q
 . . W !,"  SKIP: "_RTN_" (no "_TAG_" entry point)"
 . W !,"  Running "_TAG_"^"_RTN_"..."
 . D @(TAG_"^"_RTN)
 ;
 W !,"  RPC registration complete."
 Q
 ;
RTNLIST ; List of routines with registration tags
 ;;ZVEMINS^RUN
 ;;ZVECLIN^INSTALL
 ;;ZVEWARD^INSTALL
 ;;ZVEUSER^INSTALL
 ;;ZVESYS^INSTALL
 ;;ZVERAD^INSTALL
 ;;ZVELAB^INSTALL
 ;;ZVEPHAR^INSTALL
 ;;ZVEINV^INSTALL
 ;;ZVEQUAL^INSTALL
 ;;ZVEWRKF^INSTALL
 ;;ZVEBILL^INSTALL
 ;;END
 ;
CONTEXTS ; Set up RPC contexts
 W !,!,"--- Setting Up RPC Contexts ---"
 ;
 ; Ensure OR CPRS GUI CHART context exists
 N CTXIEN S CTXIEN=$O(^DIC(19,"B","OR CPRS GUI CHART",""))
 I CTXIEN'>0 D
 . W !,"  WARN: OR CPRS GUI CHART context not found in File #19"
 . W !,"  This means CPRS-compatible RPCs may not be accessible."
 . Q
 ;
 W !,"  OR CPRS GUI CHART context IEN: "_CTXIEN
 ;
 ; Use VEMCTX3 if available to add VE RPCs to the context
 I $L($T(RUN^VEMCTX3)) D
 . W !,"  Running VEMCTX3 to add VE RPCs to context..."
 . D RUN^VEMCTX3
 E  D
 . W !,"  VEMCTX3 not available. VE RPCs may need manual context registration."
 ;
 ; Ensure XWB DIRECT RPC context exists
 N XWBIEN S XWBIEN=$O(^DIC(19,"B","XWB DIRECT RPC",""))
 I XWBIEN>0 W !,"  XWB DIRECT RPC context IEN: "_XWBIEN
 E  W !,"  WARN: XWB DIRECT RPC context not found"
 ;
 W !,"  Context setup complete."
 Q
 ;
VERIFY ; Verify initialization
 W !,!,"=============================================="
 W !,"  Initialization Verification"
 W !,"=============================================="
 ;
 ; Count RPCs
 N CNT,IEN S CNT=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  RPCs registered (File #8994):    "_CNT
 ;
 ; Count VE RPCs specifically
 N VECNT S VECNT=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . N NAME S NAME=$P($G(^XWB(8994,IEN,0)),"^",1)
 . I $E(NAME,1,3)="VE " S VECNT=VECNT+1
 W !,"  VE custom RPCs:                  "_VECNT
 ;
 ; Count options/menus
 S CNT=0,IEN=0
 F  S IEN=$O(^DIC(19,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Options (File #19):              "_CNT
 ;
 ; Check contexts
 N CTXIEN S CTXIEN=$O(^DIC(19,"B","OR CPRS GUI CHART",""))
 W !,"  OR CPRS GUI CHART:               "_$S(CTXIEN>0:"OK (IEN="_CTXIEN_")",1:"MISSING")
 ;
 N XWBIEN S XWBIEN=$O(^DIC(19,"B","XWB DIRECT RPC",""))
 W !,"  XWB DIRECT RPC:                  "_$S(XWBIEN>0:"OK (IEN="_XWBIEN_")",1:"MISSING")
 ;
 ; Check Kernel
 N KSPIEN S KSPIEN=$O(^XTV(8989.3,0))
 W !,"  Kernel System Params:            "_$S(KSPIEN>0:"OK (IEN="_KSPIEN_")",1:"MISSING")
 ;
 W !,"=============================================="
 Q
 ;
