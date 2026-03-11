ZVEQUAL ;VE;Quality/Compliance Admin RPCs;2026-03-09
 ;
 ; Quality domain RPCs for admin dashboard.
 ; File #811.9 (CLINICAL REMINDER DEFINITION),
 ; File #810 (REMINDER DIALOG), File #740 (QA SITE PARAMETERS)
 ;
REMLIST(RESULT,SEARCH) ;List clinical reminders from File #811.9
 N IEN,NM,I,U,MAXCT
 S U="^",I=0,MAXCT=200,SEARCH=$G(SEARCH)
 I '$D(^PXD(811.9)) S RESULT(0)=0 Q
 I SEARCH'="" D  Q
 . S NM=SEARCH
 . F  S NM=$O(^PXD(811.9,"B",NM)) Q:NM=""  Q:$E(NM,1,$L(SEARCH))'=SEARCH  Q:I>=MAXCT  D
 . . S IEN=$O(^PXD(811.9,"B",NM,""))
 . . Q:'IEN
 . . S I=I+1
 . . S RESULT(I)=IEN_U_NM_U_$P($G(^PXD(811.9,IEN,0)),U,2)_U_$P($G(^PXD(811.9,IEN,0)),U,3)
 . S RESULT(0)=I
 S IEN=0
 F  S IEN=$O(^PXD(811.9,IEN)) Q:'IEN  Q:I>=MAXCT  D
 . S NM=$P($G(^PXD(811.9,IEN,0)),U,1)
 . Q:NM=""
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_$P($G(^PXD(811.9,IEN,0)),U,2)_U_$P($G(^PXD(811.9,IEN,0)),U,3)
 S RESULT(0)=I
 Q
 ;
REMDET(RESULT,REMIEN) ;Reminder detail from File #811.9
 N U,Z0
 S U="^",REMIEN=+$G(REMIEN)
 I 'REMIEN S RESULT(0)="-1^Reminder IEN required" Q
 I '$D(^PXD(811.9,REMIEN,0)) S RESULT(0)="-1^Reminder not found" Q
 S Z0=$G(^PXD(811.9,REMIEN,0))
 S RESULT(0)="1^OK"
 S RESULT(1)="IEN^"_REMIEN
 S RESULT(2)="NAME^"_$P(Z0,U,1)
 S RESULT(3)="CLASS^"_$P(Z0,U,2)
 S RESULT(4)="SPONSOR^"_$P(Z0,U,3)
 S RESULT(5)="REVIEW_DATE^"_$P(Z0,U,4)
 S RESULT(6)="ACTIVE^"_$S($P(Z0,U,6)=1:"ACTIVE",1:"INACTIVE")
 S RESULT(7)="DESCRIPTION^"_$P($G(^PXD(811.9,REMIEN,1)),U,1)
 Q
 ;
QASITE(RESULT) ;QA site parameters from File #740
 N IEN,U,Z0
 S U="^"
 I '$D(^QA(740)) S RESULT(0)="-1^QA site parameters not found (File 740)" Q
 S IEN=$O(^QA(740,0))
 I 'IEN S RESULT(0)="-1^No QA site parameter entry" Q
 S Z0=$G(^QA(740,IEN,0))
 S RESULT(0)="1^OK"
 S RESULT(1)="IEN^"_IEN
 S RESULT(2)="FACILITY^"_$P(Z0,U,1)
 S RESULT(3)="PARAM2^"_$P(Z0,U,2)
 S RESULT(4)="PARAM3^"_$P(Z0,U,3)
 Q
 ;
INSTALL ;Register RPCs in File #8994
 D REG^ZVEUSER("VE REMINDER LIST","REMLIST","ZVEQUAL")
 D REG^ZVEUSER("VE REMINDER DETAIL","REMDET","ZVEQUAL")
 D REG^ZVEUSER("VE QA SITE PARAMS","QASITE","ZVEQUAL")
 W "ZVEQUAL RPCs registered",!
 Q
