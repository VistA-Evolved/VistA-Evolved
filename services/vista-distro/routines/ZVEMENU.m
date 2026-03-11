ZVEMENU ;VE/KM - VistA Menu Tree Extractor;2026-03-10
 ;;1.0;VistA-Evolved;**1**;Mar 10, 2026;Build 1
 ;
 ; Purpose: Extracts the complete VistA menu tree from File #19 (OPTION)
 ;          to JSON format. Every menu option, its children, security keys,
 ;          associated routines, and FileMan files are captured.
 ;
 ; Output: /tmp/vista-menus/menu-tree.json    (full tree)
 ;         /tmp/vista-menus/menu-flat.json    (flat index)
 ;         /tmp/vista-menus/menu-security.json (key requirements)
 ;
 ; Entry points:
 ;   EN^ZVEMENU           - Extract full menu tree
 ;   FLAT^ZVEMENU         - Extract flat option index only
 ;   SECURITY^ZVEMENU     - Extract security key map only
 ;   SUBTREE^ZVEMENU(IEN) - Extract subtree from a specific option
 ;   VERIFY^ZVEMENU       - Count and verify options
 ;
 ; Usage:
 ;   docker exec vehu su - vehu -c "mumps -r ZVEMENU"
 ;   Then: docker cp vehu:/tmp/vista-menus/ data/vista/menus/
 ;
 Q
 ;
EN ; Full extraction
 W !,"=============================================="
 W !," VistA Menu Tree Extractor"
 W !,"=============================================="
 ;
 N DIR S DIR="/tmp/vista-menus/"
 D MKDIR(DIR)
 ;
 D FLAT
 D TREE
 D SECURITY
 ;
 W !,!,"=============================================="
 W !," Menu Extraction Complete"
 W !," Output: "_DIR
 W !,"=============================================="
 Q
 ;
FLAT ; Extract flat option index
 W !,!,"--- Extracting Flat Option Index ---"
 N DIR,FNAME,CNT
 S DIR="/tmp/vista-menus/"
 S FNAME=DIR_"menu-flat.json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 W "{",!
 W "  ""generatedAt"": """_$$FMTDT_""",",!
 W "  ""generator"": ""ZVEMENU v1.0"",",!
 W "  ""options"": [",!
 ;
 S CNT=0
 N IEN S IEN=0
 F  S IEN=$O(^DIC(19,IEN)) Q:IEN'>0  D
 . N OPT S OPT=$G(^DIC(19,IEN,0))
 . I OPT="" Q
 . ;
 . N NAME S NAME=$P(OPT,"^",1)
 . I NAME="" Q
 . ;
 . I CNT>0 W ",",!
 . D ONEOPT(IEN)
 . S CNT=CNT+1
 ;
 W !,"  ],",!
 W "  ""totalOptions"": "_CNT,!
 W "}",!
 ;
 C FNAME
 ;
 U 0
 W !,"  Flat index: "_CNT_" options written to "_FNAME
 Q
 ;
ONEOPT(IEN) ; Write one option as JSON
 N OPT,NAME,MTEXT,TYP,RTN,LCK,DESC,FILE
 ;
 S OPT=$G(^DIC(19,IEN,0))
 S NAME=$P(OPT,"^",1)
 S MTEXT=$P(OPT,"^",2)
 S TYP=$P(OPT,"^",4)
 ;
 ; Routine
 S RTN=$P($G(^DIC(19,IEN,"E")),"^",1)
 I RTN="" S RTN=$P(OPT,"^",25)
 ;
 ; Lock (security key)
 S LCK=$P(OPT,"^",6)
 ;
 ; Associated file
 S FILE=$P(OPT,"^",16)
 ;
 ; Description (first line)
 S DESC=""
 I $D(^DIC(19,IEN,1)) D
 . N L S L=$O(^DIC(19,IEN,1,0))
 . I L>0 S DESC=$G(^DIC(19,IEN,1,L,0))
 ;
 ; Type decode
 N TYPNAME S TYPNAME=$$TYPNAME(TYP)
 ;
 ; Count children
 N CHCNT S CHCNT=0
 I $D(^DIC(19,IEN,10)) D
 . N CH S CH=0
 . F  S CH=$O(^DIC(19,IEN,10,CH)) Q:CH'>0  S CHCNT=CHCNT+1
 ;
 ; Parent
 N PARENT S PARENT=""
 N PIEN S PIEN=0
 ; Walk through all options to find which has this as a child
 ; (expensive but necessary for building the tree)
 ; Skip for flat output - parent will be resolved in tree building
 ;
 W "    {",!
 W "      ""ien"": "_IEN_",",!
 W "      ""name"": """_$$ESC(NAME)_""",",!
 W "      ""menuText"": """_$$ESC(MTEXT)_""",",!
 W "      ""type"": """_$$ESC(TYPNAME)_""",",!
 W "      ""typeCode"": """_$$ESC(TYP)_""",",!
 I RTN'="" W "      ""routine"": """_$$ESC(RTN)_""",",!
 I LCK'="" W "      ""securityKey"": """_$$ESC(LCK)_""",",!
 I FILE'="" W "      ""fileNumber"": "_FILE_",",!
 W "      ""childCount"": "_CHCNT_",",!
 I DESC'="" W "      ""description"": """_$$ESC($E(DESC,1,200))_""",",!
 W "      ""ien_"": "_IEN
 W !,"    }"
 Q
 ;
TREE ; Extract hierarchical menu tree
 W !,!,"--- Extracting Hierarchical Menu Tree ---"
 N DIR,FNAME
 S DIR="/tmp/vista-menus/"
 S FNAME=DIR_"menu-tree.json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 W "{",!
 W "  ""generatedAt"": """_$$FMTDT_""",",!
 W "  ""generator"": ""ZVEMENU v1.0"",",!
 W "  ""roots"": [",!
 ;
 ; Find root menus (options that are not children of any other option)
 ; First, build a set of all child IENs
 N ISCHILD
 N PIEN S PIEN=0
 F  S PIEN=$O(^DIC(19,PIEN)) Q:PIEN'>0  D
 . I '$D(^DIC(19,PIEN,10)) Q
 . N CH S CH=0
 . F  S CH=$O(^DIC(19,PIEN,10,CH)) Q:CH'>0  D
 . . N CIEN S CIEN=$P($G(^DIC(19,PIEN,10,CH,0)),"^",1)
 . . I CIEN>0 S ISCHILD(CIEN)=""
 ;
 ; Write root options (those not in ISCHILD)
 N CNT S CNT=0
 S PIEN=0
 F  S PIEN=$O(^DIC(19,PIEN)) Q:PIEN'>0  D
 . I $D(ISCHILD(PIEN)) Q
 . N NAME S NAME=$P($G(^DIC(19,PIEN,0)),"^",1)
 . I NAME="" Q
 . ;
 . I CNT>0 W ",",!
 . D TREENODE(PIEN,2)
 . S CNT=CNT+1
 ;
 W !,"  ],",!
 W "  ""rootCount"": "_CNT,!
 W "}",!
 ;
 C FNAME
 ;
 U 0
 W !,"  Tree: "_CNT_" root menus written to "_FNAME
 Q
 ;
TREENODE(IEN,DEPTH) ; Write a tree node with children (recursive)
 N OPT,NAME,TYP,INDENT
 S OPT=$G(^DIC(19,IEN,0))
 I OPT="" Q
 S NAME=$P(OPT,"^",1)
 ;
 ; Build indent
 S INDENT="" N I F I=1:1:DEPTH S INDENT=INDENT_"  "
 ;
 W INDENT_"{",!
 W INDENT_"  ""ien"": "_IEN_",",!
 W INDENT_"  ""name"": """_$$ESC(NAME)_""",",!
 W INDENT_"  ""menuText"": """_$$ESC($P(OPT,"^",2))_""",",!
 W INDENT_"  ""type"": """_$$ESC($$TYPNAME($P(OPT,"^",4)))_""",",!
 ;
 ; Security key
 N LCK S LCK=$P(OPT,"^",6)
 I LCK'="" W INDENT_"  ""securityKey"": """_$$ESC(LCK)_""",",!
 ;
 ; Children
 I $D(^DIC(19,IEN,10)) D
 . W INDENT_"  ""children"": [",!
 . N CH,CHCNT S CH=0,CHCNT=0
 . F  S CH=$O(^DIC(19,IEN,10,CH)) Q:CH'>0  D
 . . N CIEN S CIEN=$P($G(^DIC(19,IEN,10,CH,0)),"^",1)
 . . I CIEN'>0 Q
 . . ; Prevent infinite recursion (max depth 10)
 . . I DEPTH>10 Q
 . . I CHCNT>0 W ",",!
 . . D TREENODE(CIEN,DEPTH+2)
 . . S CHCNT=CHCNT+1
 . W !,INDENT_"  ],",!
 E  D
 . W INDENT_"  ""children"": [],",!
 ;
 W INDENT_"  ""ien_"": "_IEN
 W !,INDENT_"}"
 Q
 ;
SUBTREE(IEN) ; Extract subtree from specific option IEN
 I $G(IEN)'>0 W !,"ERROR: Provide option IEN" Q
 ;
 N NAME S NAME=$P($G(^DIC(19,IEN,0)),"^",1)
 W !,"Extracting subtree from: "_NAME_" (IEN "_IEN_")",!
 ;
 N DIR,FNAME
 S DIR="/tmp/vista-menus/"
 D MKDIR(DIR)
 S FNAME=DIR_"subtree-"_IEN_".json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 D TREENODE(IEN,0)
 ;
 C FNAME
 U 0
 W !,"Subtree written to: "_FNAME
 Q
 ;
SECURITY ; Extract security key requirements for all options
 W !,!,"--- Extracting Security Key Map ---"
 N DIR,FNAME,CNT
 S DIR="/tmp/vista-menus/"
 S FNAME=DIR_"menu-security.json"
 O FNAME:(NEWVERSION) U FNAME
 ;
 W "{",!
 W "  ""generatedAt"": """_$$FMTDT_""",",!
 W "  ""keys"": {",!
 ;
 ; Group options by security key
 N KEYMAP,IEN
 S IEN=0
 F  S IEN=$O(^DIC(19,IEN)) Q:IEN'>0  D
 . N OPT S OPT=$G(^DIC(19,IEN,0))
 . N LCK S LCK=$P(OPT,"^",6)
 . I LCK="" Q
 . N NAME S NAME=$P(OPT,"^",1)
 . I NAME="" Q
 . I '$D(KEYMAP(LCK)) S KEYMAP(LCK)=""
 . S KEYMAP(LCK,IEN)=NAME
 ;
 ; Write grouped by key
 S CNT=0
 N KEY S KEY=""
 F  S KEY=$O(KEYMAP(KEY)) Q:KEY=""  D
 . I CNT>0 W ",",!
 . W "    """_$$ESC(KEY)_""": [",!
 . N OIEN,OCNT S OIEN="",OCNT=0
 . F  S OIEN=$O(KEYMAP(KEY,OIEN)) Q:OIEN=""  D
 . . I OCNT>0 W ",",!
 . . W "      {""ien"": "_OIEN_", ""name"": """_$$ESC(KEYMAP(KEY,OIEN))_"""}"
 . . S OCNT=OCNT+1
 . W !,"    ]"
 . S CNT=CNT+1
 ;
 W !,"  },",!
 W "  ""totalKeys"": "_CNT,!
 W "}",!
 ;
 C FNAME
 ;
 U 0
 W !,"  Security map: "_CNT_" keys written to "_FNAME
 Q
 ;
VERIFY ; Count and verify options
 W !,"=== Menu Verification ==="
 ;
 N TOTAL,TYPED,TYP,TYPCOUNT
 S TOTAL=0
 N IEN S IEN=0
 F  S IEN=$O(^DIC(19,IEN)) Q:IEN'>0  D
 . S TOTAL=TOTAL+1
 . S TYP=$P($G(^DIC(19,IEN,0)),"^",4)
 . I TYP="" S TYP="(empty)"
 . I '$D(TYPCOUNT(TYP)) S TYPCOUNT(TYP)=0
 . S TYPCOUNT(TYP)=TYPCOUNT(TYP)+1
 ;
 W !,"  Total options (File #19): "_TOTAL
 W !,!,"  By type:"
 S TYP=""
 F  S TYP=$O(TYPCOUNT(TYP)) Q:TYP=""  D
 . W !,"    "_$$TYPNAME(TYP)_" ("_TYP_"): "_TYPCOUNT(TYP)
 ;
 ; Count with security keys
 N LOCKED S LOCKED=0
 S IEN=0
 F  S IEN=$O(^DIC(19,IEN)) Q:IEN'>0  D
 . I $P($G(^DIC(19,IEN,0)),"^",6)'="" S LOCKED=LOCKED+1
 W !,!,"  Options requiring security key: "_LOCKED
 ;
 W !,"==========================="
 Q
 ;
 ; --- Utility functions ---
 ;
TYPNAME(TYP) ; Decode option type code
 I TYP="A" Q "action"
 I TYP="B" Q "broker"
 I TYP="E" Q "edit"
 I TYP="I" Q "inquire"
 I TYP="L" Q "limited"
 I TYP="M" Q "menu"
 I TYP="O" Q "protocol"
 I TYP="P" Q "print"
 I TYP="Q" Q "query"
 I TYP="R" Q "run-routine"
 I TYP="S" Q "server"
 I TYP="T" Q "tool"
 I TYP="U" Q "utility"
 I TYP="W" Q "window"
 I TYP="X" Q "extended-action"
 I TYP="Z" Q "programmers"
 Q "other("_TYP_")"
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
