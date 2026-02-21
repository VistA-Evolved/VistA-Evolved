ZVEMIOP ;VE/KM - VistA-Evolved Interop Monitor;2026-02-21
 ;;1.1;VistA-Evolved;**2**;Feb 21, 2026;Build 2
 ;
 ; Read-only monitoring RPCs for HL7/HLO interop telemetry.
 ; Called by VistA-Evolved platform API to display real VistA
 ; HL7 engine state in the Interop Monitor dashboard.
 ;
 ; ENTRY POINTS (RPC tags):
 ;   LINKS^ZVEMIOP   — HL7 logical links from file #870
 ;   MSGS^ZVEMIOP    — Recent HL7 message stats from #773/#772
 ;   HLOSTAT^ZVEMIOP — HLO app registry + queue indicators
 ;   QLENGTH^ZVEMIOP — Queue depth summary
 ;   MSGLIST^ZVEMIOP — Individual message list from #773 (Phase 58)
 ;   MSGDETL^ZVEMIOP — Single message detail from #773/#772 (Phase 58)
 ;
 ; ALL READS ARE STRICTLY READ-ONLY. No SET, KILL, or LOCK commands
 ; are used against clinical globals.
 ;
 Q
 ;
LINKS(RESULT,MAXN) ; RPC: VE INTEROP HL7 LINKS
 ; Returns HL7 Logical Link summary from ^HLCS(870,*)
 ; Input:  MAXN = max entries to return (default 100)
 ; Output: RESULT array — RESULT(0)=count, RESULT(n)=IEN^NAME^TYPE^STATE^DEVICE^PORT
 ;
 N IEN,CT,D0,D400,NM,MTYPE,STATE,DEV,PORT,TYPETXT
 S MAXN=+$G(MAXN) I MAXN<1 S MAXN=100
 ;
 ; Check if file exists
 I '$D(^HLCS(870,0)) D  Q
 . S RESULT(0)="0^NOT_AVAILABLE^HL LOGICAL LINK file (#870) not found"
 ;
 S CT=0,IEN=0
 F  S IEN=$O(^HLCS(870,IEN)) Q:IEN=""  Q:CT>=MAXN  D
 . S D0=$G(^HLCS(870,IEN,0))
 . S D400=$G(^HLCS(870,IEN,400))
 . S NM=$P(D0,"^",1)
 . Q:NM=""
 . S MTYPE=$P(D0,"^",3)
 . S STATE=$P(D0,"^",5)
 . S DEV=$P(D400,"^",1)
 . S PORT=$P(D400,"^",2)
 . ; Map message type code to text
 . S TYPETXT=$S(MTYPE=1:"SINGLE",MTYPE=2:"DUAL",MTYPE=3:"X3.28",1:"UNKNOWN")
 . ; Map state: 0=inactive, 1=active, ""=not set
 . S STATE=$S(STATE=0:"inactive",STATE=1:"active",1:"unknown")
 . S CT=CT+1
 . S RESULT(CT)=IEN_"^"_NM_"^"_TYPETXT_"^"_STATE_"^"_DEV_"^"_PORT
 ;
 S RESULT(0)=CT_"^OK^HL7 Logical Links from file #870"
 Q
 ;
MSGS(RESULT,HOURS) ; RPC: VE INTEROP HL7 MSGS
 ; Returns HL7 message activity summary from ^HLMA (file #773)
 ; Input:  HOURS = lookback window in hours (default 24)
 ; Output: RESULT array with message counts by direction and status
 ;
 N IEN,CT,D0,DIR,STAT,LINK,NOW,CUTOFF,DT,MTOTAL,MOUT,MIN,MDONE,MERR,MPEND
 S HOURS=+$G(HOURS) I HOURS<1 S HOURS=24
 ;
 ; Check if file exists
 I '$D(^HLMA(0)) D  Q
 . S RESULT(0)="0^NOT_AVAILABLE^HL7 MESSAGE ADMIN file (#773) not found"
 ;
 S NOW=$$NOW^XLFDT()
 ; Calculate cutoff time (HOURS ago)
 S CUTOFF=$$FMADD^XLFDT(NOW,0,-HOURS)
 ;
 S (MTOTAL,MOUT,MIN,MDONE,MERR,MPEND)=0
 S RESULT(1)="header^direction^status^link_ien^date"
 ;
 ; Scan messages (newest first for efficiency, stop at cutoff)
 S IEN=$O(^HLMA(""),-1)
 F  Q:IEN=""  D  S IEN=$O(^HLMA(IEN),-1)
 . S D0=$G(^HLMA(IEN,0))
 . Q:D0=""
 . ; Parse: piece 1=msg text IEN, 3=direction(O/I), 4=status code
 . S DIR=$P(D0,"^",3)
 . S STAT=$P(D0,"^",4)
 . S LINK=$P(D0,"^",7)
 . ; Check date from piece 11 (or approximate from IEN order)
 . S DT=$P(D0,"^",11)
 . I DT]"",(DT<CUTOFF) Q  ; Past our lookback window
 . ;
 . S MTOTAL=MTOTAL+1
 . I DIR="O" S MOUT=MOUT+1
 . I DIR="I" S MIN=MIN+1
 . ; Status: D=done, E=error, P=pending, C=completing, A=awaiting ack
 . I STAT="D" S MDONE=MDONE+1
 . I STAT="E" S MERR=MERR+1
 . I "PCA"[STAT S MPEND=MPEND+1
 ;
 S RESULT(0)="6^OK^HL7 message stats (last "_HOURS_" hours)"
 S RESULT(1)="total^"_MTOTAL
 S RESULT(2)="outbound^"_MOUT
 S RESULT(3)="inbound^"_MIN
 S RESULT(4)="completed^"_MDONE
 S RESULT(5)="errors^"_MERR
 S RESULT(6)="pending^"_MPEND
 Q
 ;
HLOSTAT(RESULT) ; RPC: VE INTEROP HLO STATUS
 ; Returns HLO availability and application registry from ^HLD(779.*)
 ; Output: RESULT array with HLO system params + app registry entries
 ;
 N IEN,CT,D0,SYS,DOMAIN,MAXQ,MODE
 ;
 ; HLO System Parameters (779.1)
 S SYS=$G(^HLD(779.1,1,0))
 I SYS="" D  Q
 . S RESULT(0)="0^NOT_AVAILABLE^HLO not configured (file #779.1 empty)"
 ;
 S DOMAIN=$P(SYS,"^",1)
 S MAXQ=$P(SYS,"^",2)
 S MODE=$P(SYS,"^",3)
 ;
 S CT=0
 S RESULT(CT+1)="system^domain="_DOMAIN_"^maxQueues="_MAXQ_"^mode="_$S(MODE="T":"TEST",MODE="P":"PROD",1:MODE)
 S CT=CT+1
 ;
 ; HLO Application Registry (779.2)
 S IEN=0
 F  S IEN=$O(^HLD(779.2,IEN)) Q:IEN=""  Q:CT>50  D
 . S D0=$G(^HLD(779.2,IEN,0))
 . Q:D0=""
 . S CT=CT+1
 . S RESULT(CT)="app^ien="_IEN_"^name="_$P(D0,"^",1)_"^package="_$P(D0,"^",2)_"^type="_$P(D0,"^",3)
 ;
 ; HLO Subscription Registry (779.4)
 N SUBCT S SUBCT=0
 S IEN=0
 F  S IEN=$O(^HLD(779.4,IEN)) Q:IEN=""  S SUBCT=SUBCT+1
 S CT=CT+1
 S RESULT(CT)="subscriptions^count="_SUBCT
 ;
 ; HLO Priority Queues (779.9)
 N QCT S QCT=0
 S IEN=0
 F  S IEN=$O(^HLD(779.9,IEN)) Q:IEN=""  S QCT=QCT+1
 S CT=CT+1
 S RESULT(CT)="priorityQueues^count="_QCT
 ;
 ; HLO Messages (^HLB / 778)
 N MSGCT S MSGCT=0
 S:$D(^HLB(0)) MSGCT=+$P($G(^HLB(0)),"^",4)
 S CT=CT+1
 S RESULT(CT)="hloMessages^totalCount="_MSGCT
 ;
 S RESULT(0)=CT_"^OK^HLO status from files #779.1, #779.2, #779.4, #779.9, #778"
 Q
 ;
QLENGTH(RESULT) ; RPC: VE INTEROP QUEUE DEPTH
 ; Returns queue depth indicators from HL7 + HLO globals
 ; Output: summary of pending work across HL7/HLO queues
 ;
 N CT,IEN,D0,STAT,PEND773,ERR773,TOTAL773
 S (PEND773,ERR773,TOTAL773)=0
 ;
 ; Count pending/error messages in #773
 I $D(^HLMA(0)) D
 . S IEN=0
 . F  S IEN=$O(^HLMA(IEN)) Q:IEN=""  D
 . . S D0=$G(^HLMA(IEN,0))
 . . S STAT=$P(D0,"^",4)
 . . S TOTAL773=TOTAL773+1
 . . I STAT="E" S ERR773=ERR773+1
 . . I "PCA"[STAT S PEND773=PEND773+1
 ;
 ; HLO queue depth (^HLB)
 N HLBTOTAL S HLBTOTAL=0
 S:$D(^HLB(0)) HLBTOTAL=+$P($G(^HLB(0)),"^",4)
 ;
 ; Monitor jobs (#776) — may be empty
 N MONCT S MONCT=0
 I $D(^HLCS(776,0)) D
 . S IEN=0
 . F  S IEN=$O(^HLCS(776,IEN)) Q:IEN=""  S MONCT=MONCT+1
 ;
 S CT=0
 S CT=CT+1,RESULT(CT)="hl7Messages^total="_TOTAL773_"^pending="_PEND773_"^errors="_ERR773
 S CT=CT+1,RESULT(CT)="hloMessages^total="_HLBTOTAL
 S CT=CT+1,RESULT(CT)="monitorJobs^count="_MONCT
 ;
 S RESULT(0)=CT_"^OK^Queue depth summary"
 Q
 ;
NOW() ; Helper — current date/time in FM format
 Q $$NOW^XLFDT()
 ;
MSGLIST(RESULT,DIR,STAT,MAXN) ; RPC: VE INTEROP MSG LIST
 ; Returns individual HL7 message rows from ^HLMA (#773)
 ; Input:  DIR  = direction filter (I=inbound, O=outbound, *=all)
 ;         STAT = status filter (D=done, E=error, P=pending, *=all)
 ;         MAXN = max rows to return (default 50)
 ; Output: RESULT(0)=count^OK, RESULT(n)=IEN^DIR^STATUS^LINK_IEN^DATE^MSG_IEN_772
 ;         NO message body is returned — metadata only.
 ;
 N IEN,CT,D0,MDIR,MSTAT,MLINK,MDT,MTXT
 S DIR=$G(DIR,"*"),STAT=$G(STAT,"*")
 S MAXN=+$G(MAXN) I MAXN<1 S MAXN=50
 ;
 I '$D(^HLMA(0)) D  Q
 . S RESULT(0)="0^NOT_AVAILABLE^HL7 MESSAGE ADMIN (#773) not found"
 ;
 S CT=0,IEN=$O(^HLMA(""),-1)
 F  Q:IEN=""  Q:CT>=MAXN  D  S IEN=$O(^HLMA(IEN),-1)
 . S D0=$G(^HLMA(IEN,0))
 . Q:D0=""
 . S MDIR=$P(D0,"^",3)
 . S MSTAT=$P(D0,"^",4)
 . ; Apply filters
 . I DIR'="*",MDIR'=DIR Q
 . I STAT'="*",MSTAT'=STAT Q
 . S MLINK=$P(D0,"^",7)
 . S MDT=$P(D0,"^",11)
 . S MTXT=$P(D0,"^",1)  ; message text IEN in #772
 . S CT=CT+1
 . S RESULT(CT)=IEN_"^"_MDIR_"^"_MSTAT_"^"_MLINK_"^"_MDT_"^"_MTXT
 ;
 S RESULT(0)=CT_"^OK^HL7 message list from #773"
 Q
 ;
MSGDETL(RESULT,MSGIEN) ; RPC: VE INTEROP MSG DETAIL
 ; Returns single HL7 message metadata + segment type summary from #773/#772
 ; Input:  MSGIEN = IEN in ^HLMA (#773)
 ; Output: RESULT(0)=status, RESULT(1..N) = metadata + segment type counts
 ;         Raw segment CONTENT is NOT returned — only segment type names and counts.
 ;         The API layer handles masking for any content that IS exposed.
 ;
 N D0,MDIR,MSTAT,MLINK,MDT,MTXT,SIEN,SLINE,SEGTYPE
 N SEGS,SEGCT,I
 S MSGIEN=+$G(MSGIEN)
 I MSGIEN<1 D  Q
 . S RESULT(0)="0^ERROR^Invalid message IEN"
 ;
 S D0=$G(^HLMA(MSGIEN,0))
 I D0="" D  Q
 . S RESULT(0)="0^NOT_FOUND^Message IEN "_MSGIEN_" not found in #773"
 ;
 S MDIR=$P(D0,"^",3)
 S MSTAT=$P(D0,"^",4)
 S MLINK=$P(D0,"^",7)
 S MDT=$P(D0,"^",11)
 S MTXT=$P(D0,"^",1)
 ;
 ; Metadata row
 S RESULT(1)="meta^ien="_MSGIEN_"^dir="_MDIR_"^status="_MSTAT_"^link="_MLINK_"^date="_MDT_"^textIen="_MTXT
 ;
 ; Count segment types from #772 (no content returned)
 K SEGS S SEGCT=0
 I MTXT]"",$D(^HL(772,MTXT)) D
 . S SIEN=0
 . F  S SIEN=$O(^HL(772,MTXT,"IN",SIEN)) Q:SIEN=""  D
 . . S SLINE=$G(^HL(772,MTXT,"IN",SIEN,0))
 . . S SEGTYPE=$P(SLINE,"|",1)
 . . I SEGTYPE="" S SEGTYPE="UNK"
 . . S SEGTYPE=$E(SEGTYPE,1,3)  ; normalize to 3-char
 . . I '$D(SEGS(SEGTYPE)) S SEGS(SEGTYPE)=0
 . . S SEGS(SEGTYPE)=SEGS(SEGTYPE)+1
 . . S SEGCT=SEGCT+1
 ;
 ; Output segment summary
 N CT S CT=1
 S SEGTYPE=""
 F  S SEGTYPE=$O(SEGS(SEGTYPE)) Q:SEGTYPE=""  D
 . S CT=CT+1
 . S RESULT(CT)="seg^type="_SEGTYPE_"^count="_SEGS(SEGTYPE)
 ;
 S CT=CT+1
 S RESULT(CT)="segTotal^count="_SEGCT
 S RESULT(0)=CT_"^OK^Message detail for IEN "_MSGIEN
 Q
