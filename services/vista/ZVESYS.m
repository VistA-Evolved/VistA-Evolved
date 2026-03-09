ZVESYS ;VE;System Administration RPCs;2026-03-09
 ;
 ; System monitoring and parameter management RPCs.
 ; Provides TaskMan monitoring, error trap review, system status,
 ; and parameter management for the admin dashboard.
 ;
TASKMAN(RESULT) ;List TaskMan tasks from ^%ZTSK
 N IEN,I,U,NM,STAT,SCHED,NMSPC,MAXCT
 S U="^",I=0,IEN=0,MAXCT=200
 I '$D(^%ZTSK) S RESULT(0)=0 Q
 F  S IEN=$O(^%ZTSK(IEN)) Q:'IEN  Q:I>=MAXCT  D
 . S NM=$P($G(^%ZTSK(IEN,0)),U,1)
 . Q:NM=""
 . S STAT=$P($G(^%ZTSK(IEN,0)),U,2)
 . S SCHED=$P($G(^%ZTSK(IEN,0)),U,6)
 . S NMSPC=$P($G(^%ZTSK(IEN,0)),U,7)
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_STAT_U_SCHED_U_NMSPC
 S RESULT(0)=I
 Q
 ;
ERRTRAP(RESULT,COUNT) ;List recent error trap entries from ^%ZTERROR
 N DT,I,U,MAXCT,ERR,LINE,RTN,ETXT
 S U="^",I=0,MAXCT=+$G(COUNT)
 I MAXCT<1 S MAXCT=50
 I MAXCT>100 S MAXCT=100
 I '$D(^%ZTERROR) S RESULT(0)=0 Q
 ; Loop by reverse date for most recent first
 S DT=""
 F  S DT=$O(^%ZTERROR(DT),-1) Q:DT=""  Q:I>=MAXCT  D
 . S ERR=""
 . F  S ERR=$O(^%ZTERROR(DT,ERR),-1) Q:ERR=""  Q:I>=MAXCT  D
 . . S ETXT=$P($G(^%ZTERROR(DT,ERR,0)),U,1)
 . . S RTN=$P($G(^%ZTERROR(DT,ERR,0)),U,2)
 . . S LINE=$P($G(^%ZTERROR(DT,ERR,0)),U,3)
 . . S I=I+1
 . . S RESULT(I)=DT_U_ERR_U_ETXT_U_RTN_U_LINE
 S RESULT(0)=I
 Q
 ;
SYSTAT(RESULT) ;System status information
 N U,OS,PROD,USERCT,VOLSET,IEN
 S U="^"
 S OS=$G(^%ZOSF("OS"))
 S PROD=$G(^%ZOSF("PROD"))
 S VOLSET=$G(^%ZOSF("VOL"))
 ; Count logged-in users via ^XUSEC
 S USERCT=0
 I $D(^XUSEC("XU")) D
 . N KEY S KEY=""
 . F  S KEY=$O(^XUSEC("XU",KEY)) Q:KEY=""  S USERCT=USERCT+1
 ; Get site name from kernel parameters
 S IEN=$O(^XTV(8989.3,0))
 S RESULT(0)="1^OK"
 S RESULT(1)="OS^"_OS
 S RESULT(2)="PRODUCTION^"_PROD
 S RESULT(3)="VOLUME_SET^"_VOLSET
 S RESULT(4)="LOGGED_IN_USERS^"_USERCT
 I IEN S RESULT(5)="DOMAIN^"_$P($G(^XTV(8989.3,IEN,0)),U,1)
 E  S RESULT(5)="DOMAIN^"
 Q
 ;
PARMLIST(RESULT,ENTITY) ;List parameters from File #8989.5
 N IEN,NM,I,U,MAXCT
 S U="^",I=0,MAXCT=200,ENTITY=$G(ENTITY)
 I '$D(^XTV(8989.5)) S RESULT(0)=0 Q
 S IEN=0
 F  S IEN=$O(^XTV(8989.5,IEN)) Q:'IEN  Q:I>=MAXCT  D
 . S NM=$P($G(^XTV(8989.5,IEN,0)),U,1)
 . Q:NM=""
 . ; If entity filter provided, check it matches
 . I ENTITY'="" Q:$P($G(^XTV(8989.5,IEN,0)),U,3)'[ENTITY
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_$P($G(^XTV(8989.5,IEN,0)),U,2)_U_$P($G(^XTV(8989.5,IEN,0)),U,3)
 S RESULT(0)=I
 Q
 ;
PARMEDT(RESULT,ENTITY,PARMNAME,VALUE) ;Edit parameter value
 ; Uses Kernel parameter APIs when available
 N U,ERR
 S U="^"
 S ENTITY=$G(ENTITY),PARMNAME=$G(PARMNAME),VALUE=$G(VALUE)
 I ENTITY="" S RESULT(0)="-1^Entity required" Q
 I PARMNAME="" S RESULT(0)="-1^Parameter name required" Q
 ; Use the Kernel XPAR API for parameter management
 I $L($T(EN^XPAR)) D  Q
 . D EN^XPAR(ENTITY,PARMNAME,1,VALUE,.ERR)
 . I +$G(ERR) S RESULT(0)="-1^"_$P(ERR,U,2) Q
 . S RESULT(0)="1^OK"
 S RESULT(0)="-1^XPAR API not available"
 Q
 ;
INSTALL ;Register RPCs in File #8994
 D REG^ZVEUSER("VE TASKMAN LIST","TASKMAN","ZVESYS")
 D REG^ZVEUSER("VE ERROR TRAP","ERRTRAP","ZVESYS")
 D REG^ZVEUSER("VE SYS STATUS","SYSTAT","ZVESYS")
 D REG^ZVEUSER("VE PARAM LIST","PARMLIST","ZVESYS")
 D REG^ZVEUSER("VE PARAM EDIT","PARMEDT","ZVESYS")
 W "ZVESYS RPCs registered",!
 Q
