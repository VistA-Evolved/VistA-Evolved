ZVEWRKF ;VE;Workforce Admin RPCs;2026-03-09
 ;
 ; Workforce domain RPCs for admin dashboard.
 ; File #200 (NEW PERSON) extended, File #8932.1 (PERSON CLASS)
 ; Provides provider-specific views beyond basic user management.
 ;
PROVLIST(RESULT,SEARCH) ;List providers from File #200 with credentials
 ; Only users that have a PERSON CLASS entry
 N IEN,NM,I,U,MAXCT,NPI,DEA,PCLASS
 S U="^",I=0,MAXCT=200,SEARCH=$G(SEARCH)
 I SEARCH'="" D  Q
 . S NM=SEARCH
 . F  S NM=$O(^VA(200,"B",NM)) Q:NM=""  Q:$E(NM,1,$L(SEARCH))'=SEARCH  Q:I>=MAXCT  D
 . . S IEN=$O(^VA(200,"B",NM,""))
 . . Q:'IEN
 . . ; Only include users with person class
 . . Q:'$D(^VA(200,IEN,"USC1"))
 . . S NPI=$P($G(^VA(200,IEN,"NPI")),U,1)
 . . S DEA=$P($G(^VA(200,IEN,"PS")),U,3)
 . . S PCLASS=$P($G(^VA(200,IEN,"USC1",1,0)),U,1)
 . . S I=I+1
 . . S RESULT(I)=IEN_U_NM_U_NPI_U_DEA_U_PCLASS
 . S RESULT(0)=I
 S IEN=0
 F  S IEN=$O(^VA(200,IEN)) Q:'IEN  Q:I>=MAXCT  D
 . S NM=$P($G(^VA(200,IEN,0)),U,1)
 . Q:NM=""
 . Q:'$D(^VA(200,IEN,"USC1"))
 . S NPI=$P($G(^VA(200,IEN,"NPI")),U,1)
 . S DEA=$P($G(^VA(200,IEN,"PS")),U,3)
 . S PCLASS=$P($G(^VA(200,IEN,"USC1",1,0)),U,1)
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_NPI_U_DEA_U_PCLASS
 S RESULT(0)=I
 Q
 ;
PROVDET(RESULT,PROVIEN) ;Provider credential detail
 N U,Z0,NPI,DEA,TAX,SUBIEN,PCLASS
 S U="^",PROVIEN=+$G(PROVIEN)
 I 'PROVIEN S RESULT(0)="-1^Provider IEN required" Q
 I '$D(^VA(200,PROVIEN,0)) S RESULT(0)="-1^Provider not found" Q
 S Z0=$G(^VA(200,PROVIEN,0))
 S RESULT(0)="1^OK"
 S RESULT(1)="IEN^"_PROVIEN
 S RESULT(2)="NAME^"_$P(Z0,U,1)
 S RESULT(3)="TITLE^"_$P(Z0,U,9)
 S NPI=$P($G(^VA(200,PROVIEN,"NPI")),U,1)
 S RESULT(4)="NPI^"_NPI
 S DEA=$P($G(^VA(200,PROVIEN,"PS")),U,3)
 S RESULT(5)="DEA^"_DEA
 S TAX=$P($G(^VA(200,PROVIEN,"PS")),U,4)
 S RESULT(6)="TAXONOMY^"_TAX
 S RESULT(7)="SERVICE^"_$P($G(^VA(200,PROVIEN,5)),U,1)
 S RESULT(8)="ACTIVE^"_$S($P($G(^VA(200,PROVIEN,"DISYS")),U,1):"INACTIVE",1:"ACTIVE")
 ; Person class entries
 N I2 S I2=8,SUBIEN=0
 F  S SUBIEN=$O(^VA(200,PROVIEN,"USC1",SUBIEN)) Q:'SUBIEN  D
 . S PCLASS=$P($G(^VA(200,PROVIEN,"USC1",SUBIEN,0)),U,1)
 . Q:PCLASS=""
 . S I2=I2+1
 . S RESULT(I2)="PERSON_CLASS^"_PCLASS_U_$P($G(^VA(200,PROVIEN,"USC1",SUBIEN,0)),U,2)
 Q
 ;
PCLSLIST(RESULT) ;List person classes from File #8932.1
 N IEN,NM,I,U
 S U="^",I=0,IEN=0
 I '$D(^USC(8932.1)) S RESULT(0)=0 Q
 F  S IEN=$O(^USC(8932.1,IEN)) Q:'IEN  D
 . S NM=$P($G(^USC(8932.1,IEN,0)),U,1)
 . Q:NM=""
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_$P($G(^USC(8932.1,IEN,0)),U,2)_U_$P($G(^USC(8932.1,IEN,0)),U,3)
 S RESULT(0)=I
 Q
 ;
INSTALL ;Register RPCs in File #8994
 D REG^ZVEUSER("VE PROV LIST","PROVLIST","ZVEWRKF")
 D REG^ZVEUSER("VE PROV DETAIL","PROVDET","ZVEWRKF")
 D REG^ZVEUSER("VE PERSON CLASS LIST","PCLSLIST","ZVEWRKF")
 W "ZVEWRKF RPCs registered",!
 Q
