ZVERPCCAT ;VE/KM - VistA RPC Catalog Extractor;2026-03-10
 ;;1.0;VistA-Evolved;**1**;Mar 10, 2026;Build 1
 ;
 ; Purpose: Extracts the complete RPC catalog from File #8994
 ;          (REMOTE PROCEDURE) to JSON, including parameter signatures,
 ;          return types, contexts, and package namespaces.
 ;
 ; Output: /tmp/vista-rpcs/rpc-catalog.json (full catalog)
 ;         /tmp/vista-rpcs/rpc-by-package.json (grouped by namespace)
 ;         /tmp/vista-rpcs/rpc-contexts.json (context membership)
 ;
 ; Entry points:
 ;   EN^ZVERPCCAT          - Extract full catalog
 ;   BYPACKAGE^ZVERPCCAT   - Extract grouped by package
 ;   CONTEXTS^ZVERPCCAT    - Extract context membership
 ;   ONERPC^ZVERPCCAT(IEN) - Extract single RPC detail
 ;   VERIFY^ZVERPCCAT      - Count and verify RPCs
 ;
 ; Usage:
 ;   docker exec vehu su - vehu -c "mumps -r ZVERPCCAT"
 ;   Then: docker cp vehu:/tmp/vista-rpcs/ data/vista/rpcs/
 ;
 Q
 ;
EN ; Full extraction
 W !,"=============================================="
 W !," VistA RPC Catalog Extractor"
 W !,"=============================================="
 ;
 N DIR S DIR="/tmp/vista-rpcs/"
 D MKDIR(DIR)
 ;
 D CATALOG
 D BYPACKAGE
 D CONTEXTS
 ;
 W !,!,"=============================================="
 W !," RPC Catalog Extraction Complete"
 W !," Output: "_DIR
 W !,"=============================================="
 Q
 ;
CATALOG ; Extract full RPC catalog
 W !,!,"--- Extracting Full RPC Catalog ---"
 N DIR,FNAME,CNT
 S DIR="/tmp/vista-rpcs/"
 S FNAME=DIR_"rpc-catalog.json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 W "{",!
 W "  ""generatedAt"": """_$$FMTDT_""",",!
 W "  ""generator"": ""ZVERPCCAT v1.0"",",!
 W "  ""rpcs"": [",!
 ;
 S CNT=0
 N IEN S IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . N RPC S RPC=$G(^XWB(8994,IEN,0))
 . I RPC="" Q
 . ;
 . I CNT>0 W ",",!
 . D RPCJSON(IEN)
 . S CNT=CNT+1
 ;
 W !,"  ],",!
 W "  ""totalRpcs"": "_CNT,!
 W "}",!
 ;
 C FNAME
 U 0
 W !,"  Catalog: "_CNT_" RPCs written to "_FNAME
 Q
 ;
RPCJSON(IEN) ; Write one RPC as JSON
 N RPC,NAME,TAG,RTN,RTYPE,DESC,APPCTX,INACTIVE
 ;
 S RPC=$G(^XWB(8994,IEN,0))
 S NAME=$P(RPC,"^",1)
 S TAG=$P(RPC,"^",2)
 S RTN=$P(RPC,"^",3)
 S RTYPE=$P(RPC,"^",4)
 S INACTIVE=$P(RPC,"^",5)
 ;
 ; Return type decode
 N RTNAME S RTNAME=$$RTNAME(RTYPE)
 ;
 ; App proxy flag
 N APPPROX S APPPROX=$P(RPC,"^",6)
 ;
 ; Description
 S DESC=""
 I $D(^XWB(8994,IEN,1)) D
 . N L S L=0
 . F  S L=$O(^XWB(8994,IEN,1,L)) Q:L'>0  D
 . . N LN S LN=$G(^XWB(8994,IEN,1,L,0))
 . . I LN'="" S DESC=DESC_LN_" "
 ;
 ; Input parameters
 N PARAMS,PCNT S PCNT=0
 I $D(^XWB(8994,IEN,2)) D
 . N P S P=0
 . F  S P=$O(^XWB(8994,IEN,2,P)) Q:P'>0  D
 . . N PD S PD=$G(^XWB(8994,IEN,2,P,0))
 . . I PD="" Q
 . . S PCNT=PCNT+1
 . . N PNAME S PNAME=$P(PD,"^",1)
 . . N PTYPE S PTYPE=$P(PD,"^",2)
 . . N PREQ S PREQ=$P(PD,"^",3)
 . . N PMAXLEN S PMAXLEN=$P(PD,"^",4)
 . . S PARAMS(PCNT)=PNAME_"^"_PTYPE_"^"_PREQ_"^"_PMAXLEN
 ;
 ; Determine package namespace from routine or name
 N NS S NS=$$GETNS(NAME,RTN)
 ;
 ; Write JSON
 W "    {",!
 W "      ""ien"": "_IEN_",",!
 W "      ""name"": """_$$ESC(NAME)_""",",!
 W "      ""tag"": """_$$ESC(TAG)_""",",!
 W "      ""routine"": """_$$ESC(RTN)_""",",!
 W "      ""returnType"": """_RTNAME_""",",!
 W "      ""returnTypeCode"": "_+RTYPE_",",!
 W "      ""namespace"": """_$$ESC(NS)_""",",!
 I INACTIVE'="" W "      ""inactive"": true,",!
 I APPPROX'="" W "      ""appProxy"": true,",!
 ;
 ; Parameters
 W "      ""paramCount"": "_PCNT_",",!
 W "      ""params"": [",!
 I PCNT>0 D
 . N I
 . F I=1:1:PCNT D
 . . N PD S PD=$G(PARAMS(I))
 . . I I>1 W ",",!
 . . W "        {"
 . . W """name"": """_$$ESC($P(PD,"^",1))_""""
 . . W ", ""type"": """_$$PTYPE($P(PD,"^",2))_""""
 . . W ", ""required"": "_$S($P(PD,"^",3)="Y":"true",1:"false")
 . . I $P(PD,"^",4)>0 W ", ""maxLength"": "_$P(PD,"^",4)
 . . W "}"
 W !,"      ],",!
 ;
 ; Description (truncated)
 I DESC'="" W "      ""description"": """_$$ESC($E(DESC,1,300))_""",",!
 ;
 W "      ""ien_"": "_IEN
 W !,"    }"
 Q
 ;
ONERPC(IEN) ; Extract and display single RPC detail
 I $G(IEN)'>0 W !,"ERROR: Provide RPC IEN" Q
 ;
 N NAME S NAME=$P($G(^XWB(8994,IEN,0)),"^",1)
 I NAME="" W !,"RPC IEN "_IEN_" not found" Q
 ;
 W !,"--- RPC Detail: "_NAME_" (IEN "_IEN_") ---"
 W !
 ;
 N RPC S RPC=$G(^XWB(8994,IEN,0))
 W !,"Name:        "_$P(RPC,"^",1)
 W !,"Tag:         "_$P(RPC,"^",2)
 W !,"Routine:     "_$P(RPC,"^",3)
 W !,"Return type: "_$$RTNAME($P(RPC,"^",4))
 W !,"Inactive:    "_$S($P(RPC,"^",5)'="":"YES",1:"no")
 W !,"App proxy:   "_$S($P(RPC,"^",6)'="":"YES",1:"no")
 ;
 ; Parameters
 W !,"Parameters:"
 I $D(^XWB(8994,IEN,2)) D
 . N P S P=0
 . F  S P=$O(^XWB(8994,IEN,2,P)) Q:P'>0  D
 . . N PD S PD=$G(^XWB(8994,IEN,2,P,0))
 . . W !,"  ["_P_"] "_$P(PD,"^",1)
 . . W " ("_$$PTYPE($P(PD,"^",2))_")"
 . . I $P(PD,"^",3)="Y" W " REQUIRED"
 E  W !,"  (none)"
 ;
 ; Description
 W !,"Description:"
 I $D(^XWB(8994,IEN,1)) D
 . N L S L=0
 . F  S L=$O(^XWB(8994,IEN,1,L)) Q:L'>0  D
 . . W !,"  "_$G(^XWB(8994,IEN,1,L,0))
 E  W !,"  (none)"
 ;
 W !
 Q
 ;
BYPACKAGE ; Extract RPCs grouped by package namespace
 W !,!,"--- Extracting RPCs by Package ---"
 N DIR,FNAME
 S DIR="/tmp/vista-rpcs/"
 S FNAME=DIR_"rpc-by-package.json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 ; Build namespace map
 N NSMAP,IEN
 S IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . N RPC S RPC=$G(^XWB(8994,IEN,0))
 . I RPC="" Q
 . N NAME S NAME=$P(RPC,"^",1)
 . N RTN S RTN=$P(RPC,"^",3)
 . N NS S NS=$$GETNS(NAME,RTN)
 . I NS="" S NS="UNKNOWN"
 . S NSMAP(NS,IEN)=NAME
 ;
 ; Write JSON
 W "{",!
 W "  ""generatedAt"": """_$$FMTDT_""",",!
 W "  ""packages"": {",!
 ;
 N NS,CNT S CNT=0
 S NS=""
 F  S NS=$O(NSMAP(NS)) Q:NS=""  D
 . I CNT>0 W ",",!
 . W "    """_$$ESC(NS)_""": {",!
 . W "      ""rpcs"": [",!
 . ;
 . N IEN2,RCNT S RCNT=0
 . S IEN2=""
 . F  S IEN2=$O(NSMAP(NS,IEN2)) Q:IEN2=""  D
 . . I RCNT>0 W ",",!
 . . W "        {""ien"": "_IEN2_", ""name"": """_$$ESC(NSMAP(NS,IEN2))_"""}"
 . . S RCNT=RCNT+1
 . ;
 . W !,"      ],",!
 . W "      ""count"": "_RCNT
 . W !,"    }"
 . S CNT=CNT+1
 ;
 W !,"  },",!
 W "  ""totalPackages"": "_CNT,!
 W "}",!
 ;
 C FNAME
 U 0
 W !,"  By-package: "_CNT_" packages written to "_FNAME
 Q
 ;
CONTEXTS ; Extract RPC context membership
 W !,!,"--- Extracting RPC Contexts ---"
 N DIR,FNAME
 S DIR="/tmp/vista-rpcs/"
 S FNAME=DIR_"rpc-contexts.json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 W "{",!
 W "  ""generatedAt"": """_$$FMTDT_""",",!
 W "  ""contexts"": [",!
 ;
 ; Find all Broker context options (type "B") in File #19
 N IEN,CNT S IEN=0,CNT=0
 F  S IEN=$O(^DIC(19,IEN)) Q:IEN'>0  D
 . N OPT S OPT=$G(^DIC(19,IEN,0))
 . N TYP S TYP=$P(OPT,"^",4)
 . I TYP'="B" Q
 . ;
 . N NAME S NAME=$P(OPT,"^",1)
 . I NAME="" Q
 . ;
 . I CNT>0 W ",",!
 . W "    {",!
 . W "      ""ien"": "_IEN_",",!
 . W "      ""name"": """_$$ESC(NAME)_""",",!
 . ;
 . ; Get RPCs registered in this context
 . W "      ""rpcs"": [",!
 . N RPCIEN,RCNT S RPCIEN=0,RCNT=0
 . I $D(^DIC(19,IEN,"RPC")) D
 . . F  S RPCIEN=$O(^DIC(19,IEN,"RPC",RPCIEN)) Q:RPCIEN'>0  D
 . . . N RNAME S RNAME=$P($G(^DIC(19,IEN,"RPC",RPCIEN,0)),"^",1)
 . . . I RNAME="" Q
 . . . I RCNT>0 W ",",!
 . . . W "        """_$$ESC(RNAME)_""""
 . . . S RCNT=RCNT+1
 . ;
 . W !,"      ],",!
 . W "      ""rpcCount"": "_RCNT
 . W !,"    }"
 . S CNT=CNT+1
 ;
 W !,"  ],",!
 W "  ""totalContexts"": "_CNT,!
 W "}",!
 ;
 C FNAME
 U 0
 W !,"  Contexts: "_CNT_" contexts written to "_FNAME
 Q
 ;
VERIFY ; Count and verify RPCs
 W !,"=== RPC Catalog Verification ==="
 ;
 N TOTAL,IEN S TOTAL=0
 S IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  S TOTAL=TOTAL+1
 W !,"  Total RPCs (File #8994): "_TOTAL
 ;
 ; Count by return type
 N RTMAP
 S IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . N RT S RT=$P($G(^XWB(8994,IEN,0)),"^",4)
 . S RT=$$RTNAME(RT)
 . I '$D(RTMAP(RT)) S RTMAP(RT)=0
 . S RTMAP(RT)=RTMAP(RT)+1
 ;
 W !,"  By return type:"
 N RT S RT=""
 F  S RT=$O(RTMAP(RT)) Q:RT=""  W !,"    "_RT_": "_RTMAP(RT)
 ;
 ; Count with parameters
 N WITHPARAMS S WITHPARAMS=0
 S IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . I $D(^XWB(8994,IEN,2)) S WITHPARAMS=WITHPARAMS+1
 W !,"  RPCs with parameters: "_WITHPARAMS
 ;
 ; Count VE custom RPCs
 N VECNT S VECNT=0
 S IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . N NAME S NAME=$P($G(^XWB(8994,IEN,0)),"^",1)
 . I $E(NAME,1,3)="VE " S VECNT=VECNT+1
 W !,"  VE custom RPCs: "_VECNT
 ;
 W !,"==========================="
 Q
 ;
 ; --- Utility functions ---
 ;
RTNAME(RT) ; Decode return type
 I RT=1 Q "SINGLE VALUE"
 I RT=2 Q "ARRAY"
 I RT=3 Q "WORD PROCESSING"
 I RT=4 Q "GLOBAL ARRAY"
 I RT=5 Q "GLOBAL INSTANCE"
 Q "UNKNOWN("_RT_")"
 ;
PTYPE(PT) ; Decode parameter type
 I PT=1 Q "LITERAL"
 I PT=2 Q "REFERENCE"
 I PT=3 Q "LIST"
 I PT=4 Q "WORD-PROCESSING"
 Q "UNKNOWN("_PT_")"
 ;
GETNS(NAME,RTN) ; Determine package namespace
 ; Try RPC name prefix first
 N NS S NS=""
 I $E(NAME,1,3)="VE " Q "VE"
 I $E(NAME,1,3)="OR " Q "OR"
 I $E(NAME,1,4)="TIU " Q "TIU"
 I $E(NAME,1,4)="PSB " Q "PSB"
 I $E(NAME,1,4)="PSO " Q "PSO"
 I $E(NAME,1,4)="PSJ " Q "PSJ"
 I $E(NAME,1,3)="LR " Q "LR"
 I $E(NAME,1,3)="RA " Q "RA"
 I $E(NAME,1,3)="SD " Q "SD"
 I $E(NAME,1,4)="MAG " Q "MAG"
 I $E(NAME,1,4)="XUS " Q "XUS"
 I $E(NAME,1,4)="XWB " Q "XWB"
 I $E(NAME,1,4)="GMR " Q "GMR"
 I $E(NAME,1,4)="GMP " Q "GMP"
 I $E(NAME,1,4)="GMV " Q "GMV"
 I $E(NAME,1,3)="DG " Q "DG"
 I $E(NAME,1,3)="IB " Q "IB"
 I $E(NAME,1,3)="FB " Q "FB"
 I $E(NAME,1,3)="EC " Q "EC"
 I $E(NAME,1,3)="HL " Q "HL"
 I $E(NAME,1,3)="SR " Q "SR"
 I $E(NAME,1,3)="PX " Q "PX"
 I $E(NAME,1,5)="SDES " Q "SDES"
 I $E(NAME,1,5)="SDEC " Q "SDEC"
 I $E(NAME,1,5)="SDOE " Q "SDOE"
 ;
 ; Try routine prefix
 I RTN'="" D
 . S NS=$E(RTN,1,2)
 . I $E(RTN,1,3)="ZVE" S NS="VE"
 ;
 Q NS
 ;
ESC(S) ; Escape string for JSON
 N R,I,C S R=""
 F I=1:1:$L(S) D
 . S C=$E(S,I)
 . I C="""" S R=R_"\""" Q
 . I C="\" S R=R_"\\" Q
 . I $A(C)<32 S R=R_" " Q
 . S R=R_C
 Q R
 ;
FMTDT() ; Format current date/time
 N DT S DT=$$DT^XLFDT()
 N Y S Y=$E(DT,1,3)+1700
 N M S M=$E(DT,4,5)
 N D S D=$E(DT,6,7)
 Q Y_"-"_M_"-"_D_"T00:00:00Z"
 ;
MKDIR(PATH) ; Create directory
 ZSY "mkdir -p "_PATH
 Q
 ;
