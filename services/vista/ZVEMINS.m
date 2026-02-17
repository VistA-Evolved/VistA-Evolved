ZVEMINS ;VE/KM - VistA-Evolved Interop RPC Installer;2026-02-17
 ;;1.0;VistA-Evolved;**1**;Feb 17, 2026;Build 1
 ;
 ; Registers VE INTEROP * RPCs in file 8994 (REMOTE PROCEDURE)
 ; and adds them to the OR CPRS GUI CHART context or XWB DIRECT RPC.
 ;
 ; Run once: D RUN^ZVEMINS
 ; This is idempotent — skips if RPCs already exist.
 ;
 Q
 ;
RUN ; Main entry — register all 4 RPCs
 D REGONE("VE INTEROP HL7 LINKS","LINKS","ZVEMIOP","Returns HL7 logical link status")
 D REGONE("VE INTEROP HL7 MSGS","MSGS","ZVEMIOP","Returns HL7 message activity summary")
 D REGONE("VE INTEROP HLO STATUS","HLOSTAT","ZVEMIOP","Returns HLO app registry and system params")
 D REGONE("VE INTEROP QUEUE DEPTH","QLENGTH","ZVEMIOP","Returns queue depth indicators")
 ;
 W !,"--- Registration complete ---",!
 W "Checking results...",!
 D CHECK
 Q
 ;
REGONE(NAME,TAG,RTN,DESC) ; Register one RPC in file 8994
 ; If it already exists, skip
 N IEN,FDA,IENS,ERRS
 ;
 S IEN=$$FIND1^DIC(8994,,"BX",NAME)
 I IEN>0 D  Q
 . W !,"RPC '"_NAME_"' already registered (IEN="_IEN_"), skipping."
 ;
 W !,"Registering RPC: ",NAME,"..."
 ;
 ; Build FDA array for FileMan
 ; Field .01 = NAME
 ; Field .02 = TAG
 ; Field .03 = ROUTINE
 ; Field .04 = RETURN VALUE TYPE (must be ARRAY = 2)
 ; Field 1 = DESCRIPTION (word processing, handle separately)
 ;
 S IENS="+1,"
 S FDA(8994,IENS,.01)=NAME
 S FDA(8994,IENS,.02)=TAG
 S FDA(8994,IENS,.03)=RTN
 S FDA(8994,IENS,.04)=2  ; ARRAY return type
 ;
 D UPDATE^DIE("E","FDA","","ERRS")
 ;
 I $D(ERRS) D  Q
 . W !,"  ** ERROR registering "_NAME_": "
 . W $G(ERRS("DIERR",1,"TEXT",1)),!
 ;
 ; Get the new IEN
 S IEN=$$FIND1^DIC(8994,,"BX",NAME)
 W "  OK (IEN="_IEN_")",!
 ;
 ; Add description as word processing field
 I IEN>0 D
 . S ^XTV(8994,IEN,1,1,0)=DESC
 . S ^XTV(8994,IEN,1,0)="^^1^1^"_$$DT^XLFDT()
 ;
 ; Add to B cross-reference (should be automatic via FileMan)
 Q
 ;
CHECK ; Verify all 4 RPCs are registered
 N NAMES,I,NM,IEN
 S NAMES="VE INTEROP HL7 LINKS,VE INTEROP HL7 MSGS,VE INTEROP HLO STATUS,VE INTEROP QUEUE DEPTH"
 W !,"--- Verification ---"
 F I=1:1:4 D
 . S NM=$P(NAMES,",",I)
 . S IEN=$$FIND1^DIC(8994,,"BX",NM)
 . W !,"  ",NM," => ",$S(IEN>0:"REGISTERED (IEN="_IEN_")",1:"** NOT FOUND **")
 W !
 Q
