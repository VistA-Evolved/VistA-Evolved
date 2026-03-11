ZVEDDICT ;VE/KM - FileMan Data Dictionary Extractor;2026-03-10
 ;;1.0;VistA-Evolved;**1**;Mar 10, 2026;Build 1
 ;
 ; Purpose: Extracts the complete FileMan data dictionary from a running
 ;          VistA instance to JSON format, suitable for code generation.
 ;
 ; Output: Writes JSON to /tmp/vista-schema/ directory
 ;         One file per FileMan file: file-{number}.json
 ;         Plus an index file: file-index.json
 ;
 ; Entry points:
 ;   EN^ZVEDDICT          - Extract ALL files (full run)
 ;   ONEFILE^ZVEDDICT(FN) - Extract single file by number
 ;   INDEX^ZVEDDICT       - Generate index of all files
 ;   VERIFY^ZVEDDICT      - Count files and fields
 ;
 ; Usage:
 ;   docker exec vehu su - vehu -c "mumps -r ZVEDDICT"
 ;   Then: docker cp vehu:/tmp/vista-schema/ data/vista/schema/
 ;
 Q
 ;
EN ; Extract all FileMan files
 W !,"=============================================="
 W !," FileMan Data Dictionary Extractor"
 W !,"=============================================="
 ;
 ; Create output directory
 N DIR S DIR="/tmp/vista-schema/"
 D MKDIR(DIR)
 ;
 ; Iterate all files in ^DIC
 N FN,CNT,TOTAL S CNT=0,TOTAL=0
 ;
 ; Count total files first
 S FN=0 F  S FN=$O(^DIC(FN)) Q:FN'>0  S TOTAL=TOTAL+1
 W !,"Total files in ^DIC: "_TOTAL
 ;
 ; Extract each file
 S FN=0
 F  S FN=$O(^DIC(FN)) Q:FN'>0  D
 . D ONEFILE(FN)
 . S CNT=CNT+1
 . I CNT#100=0 W !,"  Progress: "_CNT_"/"_TOTAL_" files extracted"
 ;
 W !,!,"Extracted "_CNT_" files"
 ;
 ; Generate index
 D INDEX
 ;
 W !,"=============================================="
 W !," Extraction Complete"
 W !," Output: "_DIR
 W !,"=============================================="
 Q
 ;
ONEFILE(FN) ; Extract one file to JSON
 N DIR,FNAME,IO,NAME,GLOB,FLDCNT
 S DIR="/tmp/vista-schema/"
 ;
 ; Get file name from ^DIC
 S NAME=$P($G(^DIC(FN,0)),"^",1)
 I NAME="" Q
 ;
 ; Get global root
 S GLOB=$P($G(^DIC(FN,0)),"^",2)
 ;
 ; Open output file
 S FNAME=DIR_"file-"_$$FNUM(FN)_".json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 ; Write JSON header
 W "{",!
 W "  ""fileNumber"": "_FN_",",!
 W "  ""fileName"": """_$$ESC(NAME)_""",",!
 W "  ""globalRoot"": """_$$ESC($G(GLOB))_""",",!
 ;
 ; Extract access nodes
 N ACC S ACC=$G(^DIC(FN,0,"GL"))
 W "  ""globalReference"": """_$$ESC(ACC)_""",",!
 ;
 ; DD access levels
 N DD0 S DD0=$G(^DD(FN,0,"DDA"))
 W "  ""ddAccess"": """_$$ESC(DD0)_""",",!
 ;
 ; Security access
 N SEC S SEC=""
 I $D(^DIC(FN,0,"AUDIT")) S SEC="audited"
 W "  ""securityAudit"": """_SEC_""",",!
 ;
 ; Extract fields
 W "  ""fields"": [",!
 S FLDCNT=0
 N FLD S FLD=0
 F  S FLD=$O(^DD(FN,FLD)) Q:FLD'>0  D
 . I FLD=0 Q
 . I FLDCNT>0 W ",",!
 . D ONEFLD(FN,FLD)
 . S FLDCNT=FLDCNT+1
 ;
 W !,"  ],",!
 W "  ""fieldCount"": "_FLDCNT_",",!
 ;
 ; Extract cross-references
 W "  ""crossReferences"": [",!
 D XREFS(FN)
 W !,"  ],",!
 ;
 ; Extract identifiers
 W "  ""identifiers"": [",!
 D IDENTS(FN)
 W !,"  ]",!
 ;
 W "}",!
 ;
 C FNAME
 Q
 ;
ONEFLD(FN,FLD) ; Extract one field definition
 N FDEF,FNAME,FTYPE,FLEN,FREQ,PTR,CODES,XFORM,HELP
 ;
 S FDEF=$G(^DD(FN,FLD,0))
 I FDEF="" Q
 ;
 S FNAME=$P(FDEF,"^",1)
 S FTYPE=$P(FDEF,"^",2)
 ;
 ; Parse field type
 N DTYPE S DTYPE=$$DTYPE(FTYPE)
 ;
 ; Get field length
 S FLEN=""
 I FTYPE["J" S FLEN=$P(FTYPE,"J",2) S FLEN=$P(FLEN,",",1)
 ;
 ; Required?
 S FREQ=0
 I $P(FDEF,"^",2)["R" S FREQ=1
 ;
 ; Pointer to
 S PTR=""
 I FTYPE["P" D
 . N PFILE S PFILE=$P(FTYPE,"P",2)
 . S PFILE=$P(PFILE,"'",1)
 . S PTR=+PFILE
 ;
 ; Set of codes
 S CODES=""
 I DTYPE="SET" D
 . S CODES=$P(FDEF,"^",3)
 ;
 ; Input transform
 S XFORM=$G(^DD(FN,FLD,"V"))
 I XFORM="" S XFORM=$G(^DD(FN,FLD,0,"V"))
 ;
 ; Help text
 S HELP=""
 I $D(^DD(FN,FLD,21)) D
 . N L S L=0
 . F  S L=$O(^DD(FN,FLD,21,L)) Q:L'>0  D
 . . S HELP=HELP_$G(^DD(FN,FLD,21,L,0))_" "
 ;
 ; Write JSON
 W "    {",!
 W "      ""fieldNumber"": "_FLD_",",!
 W "      ""fieldName"": """_$$ESC(FNAME)_""",",!
 W "      ""dataType"": """_DTYPE_""",",!
 W "      ""rawType"": """_$$ESC(FTYPE)_""",",!
 I FLEN'="" W "      ""length"": "_FLEN_",",!
 W "      ""required"": "_$S(FREQ:"true",1:"false")_",",!
 I PTR>0 W "      ""pointerTo"": "_PTR_",",!
 I CODES'="" W "      ""setOfCodes"": """_$$ESC(CODES)_""",",!
 I XFORM'="" W "      ""inputTransform"": """_$$ESC(XFORM)_""",",!
 I HELP'="" W "      ""helpText"": """_$$ESC($E(HELP,1,500))_""",",!
 ;
 ; Check for subfile (multiple)
 I FTYPE["W"!(FN'=+FTYPE&(+FTYPE>0)&(FTYPE'["P")) D
 . W "      ""isMultiple"": true,",!
 . W "      ""subFileNumber"": "_+FTYPE_",",!
 ;
 ; Computed field check
 I $D(^DD(FN,FLD,"CM")) D
 . W "      ""isComputed"": true,",!
 ;
 W "      ""fieldNumber_"": "_FLD
 W !,"    }"
 Q
 ;
XREFS(FN) ; Extract cross-references for file
 N IX,CNT S CNT=0
 S IX=""
 F  S IX=$O(^DD(FN,0,"IX",IX)) Q:IX=""  D
 . I CNT>0 W ",",!
 . N FLD S FLD=$G(^DD(FN,0,"IX",IX))
 . W "    {""name"": """_$$ESC(IX)_""", ""field"": "_$G(FLD)_"}"
 . S CNT=CNT+1
 ;
 ; Also check traditional xrefs
 N FLD S FLD=0
 F  S FLD=$O(^DD(FN,FLD)) Q:FLD'>0  D
 . I FLD=0 Q
 . N XR S XR=""
 . F  S XR=$O(^DD(FN,FLD,1,XR)) Q:XR=""  D
 . . N XRDATA S XRDATA=$G(^DD(FN,FLD,1,XR,0))
 . . I XRDATA="" Q
 . . I CNT>0 W ",",!
 . . N XRNAME S XRNAME=$P(XRDATA,"^",1)
 . . W "    {""name"": """_$$ESC(XRNAME)_""", ""field"": "_FLD_", ""type"": ""regular""}"
 . . S CNT=CNT+1
 Q
 ;
IDENTS(FN) ; Extract identifier fields
 N ID,CNT S CNT=0
 S ID=""
 F  S ID=$O(^DD(FN,0,"ID",ID)) Q:ID=""  D
 . I CNT>0 W ",",!
 . N VAL S VAL=$G(^DD(FN,0,"ID",ID))
 . W "    {""field"": "_ID_", ""value"": """_$$ESC(VAL)_"""}"
 . S CNT=CNT+1
 Q
 ;
INDEX ; Generate file index
 N DIR,FNAME,IO
 S DIR="/tmp/vista-schema/"
 S FNAME=DIR_"file-index.json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 W "{",!
 W "  ""generatedAt"": """_$$FMTDT_""",",!
 W "  ""generator"": ""ZVEDDICT v1.0"",",!
 W "  ""files"": [",!
 ;
 N FN,CNT S CNT=0
 S FN=0
 F  S FN=$O(^DIC(FN)) Q:FN'>0  D
 . N NAME S NAME=$P($G(^DIC(FN,0)),"^",1)
 . I NAME="" Q
 . N GLOB S GLOB=$P($G(^DIC(FN,0)),"^",2)
 . N NS S NS=$E(GLOB,2,$L(GLOB)-1)
 . ;
 . ; Count fields
 . N FCNT,F S FCNT=0,F=0
 . F  S F=$O(^DD(FN,F)) Q:F'>0  S FCNT=FCNT+1
 . ;
 . I CNT>0 W ",",!
 . W "    {""fileNumber"": "_FN
 . W ", ""fileName"": """_$$ESC(NAME)_""""
 . W ", ""globalRoot"": """_$$ESC($G(GLOB))_""""
 . W ", ""fieldCount"": "_FCNT
 . W ", ""namespace"": """_$$ESC($$GETNS(FN))_""""
 . W "}"
 . S CNT=CNT+1
 ;
 W !,"  ],",!
 W "  ""totalFiles"": "_CNT,!
 W "}",!
 ;
 C FNAME
 W !,"Index written: "_FNAME_" ("_CNT_" files)"
 Q
 ;
VERIFY ; Count files and fields
 W !,"=== Data Dictionary Verification ==="
 ;
 N FN,FILECNT,FLDCNT,MAXFLD S FILECNT=0,FLDCNT=0,MAXFLD=0
 S FN=0
 F  S FN=$O(^DIC(FN)) Q:FN'>0  D
 . S FILECNT=FILECNT+1
 . N F,FC S FC=0,F=0
 . F  S F=$O(^DD(FN,F)) Q:F'>0  S FC=FC+1
 . S FLDCNT=FLDCNT+FC
 . I FC>MAXFLD S MAXFLD=FC
 ;
 W !,"  FileMan files:  "_FILECNT
 W !,"  Total fields:   "_FLDCNT
 W !,"  Max fields/file: "_MAXFLD
 W !,"  Avg fields/file: "_$J(FLDCNT/FILECNT,"",1)
 ;
 ; Show top 10 largest files
 W !,!,"  Largest files:"
 N TOP,I
 D TOPFILES(.TOP)
 F I=1:1:10 Q:'$D(TOP(I))  D
 . W !,"    "_$P(TOP(I),"^",1)_": "_$P(TOP(I),"^",2)_" ("_$P(TOP(I),"^",3)_" fields)"
 ;
 W !,"==========================="
 Q
 ;
TOPFILES(TOP) ; Get top 10 files by field count
 N FN,FC,F,ARR
 S FN=0
 F  S FN=$O(^DIC(FN)) Q:FN'>0  D
 . S FC=0,F=0
 . F  S F=$O(^DD(FN,F)) Q:F'>0  S FC=FC+1
 . N NAME S NAME=$P($G(^DIC(FN,0)),"^",1)
 . S ARR(10000-FC,FN)=NAME
 ;
 N KEY,IEN,I S I=0
 S KEY="" F  S KEY=$O(ARR(KEY)) Q:KEY=""  D  Q:I>9
 . S IEN="" F  S IEN=$O(ARR(KEY,IEN)) Q:IEN=""  D  Q:I>9
 . . S I=I+1
 . . S TOP(I)=IEN_"^"_ARR(KEY,IEN)_"^"_(10000-KEY)
 Q
 ;
 ; --- Utility functions ---
 ;
DTYPE(TYP) ; Determine data type from DD type string
 I TYP["W" Q "WORD-PROCESSING"
 I TYP["P" Q "POINTER"
 I TYP["D" Q "DATE"
 I TYP["S" Q "SET"
 I TYP["N" Q "NUMERIC"
 I TYP["F" Q "FREE-TEXT"
 I TYP["C" Q "COMPUTED"
 I TYP["V" Q "VARIABLE-POINTER"
 I TYP["B" Q "BOOLEAN"
 I TYP["K" Q "MUMPS"
 I +TYP>0 Q "SUBFILE"
 Q "UNKNOWN"
 ;
FNUM(N) ; Format file number for filename (dots to dashes)
 N R,I,C S R=""
 F I=1:1:$L(N) S C=$E(N,I) S:C="." C="-" S R=R_C
 Q R
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
FMTDT() ; Format current date/time as ISO 8601
 N DT,TM,Y,M,D,H,MI,SE
 S DT=$$DT^XLFDT()
 S Y=$E(DT,1,3)+1700
 S M=$E(DT,4,5)
 S D=$E(DT,6,7)
 S TM=$$NOW^XLFDT()
 S H=$P($P(TM,".",2)_"000000",1,2)
 I H="" S H="00"
 S MI=$E($P(TM,".",2)_"000000",3,4)
 S SE=$E($P(TM,".",2)_"000000",5,6)
 Q Y_"-"_M_"-"_D_"T"_H_":"_MI_":"_SE_"Z"
 ;
GETNS(FN) ; Get package namespace for a file number
 N GLOB,NS S GLOB=$P($G(^DIC(FN,0)),"^",2)
 I GLOB="" Q ""
 S NS=$E(GLOB,2)
 ; Extract first letters before (
 N I,C S NS=""
 F I=2:1:$L(GLOB) S C=$E(GLOB,I) Q:C="("  S NS=NS_C
 Q NS
 ;
MKDIR(PATH) ; Create directory (Linux)
 N CMD S CMD="mkdir -p "_PATH
 ZSY CMD
 Q
 ;
