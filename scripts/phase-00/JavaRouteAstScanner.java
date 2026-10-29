import com.sun.source.tree.*;
import com.sun.source.util.*;
import javax.tools.*;
import java.nio.file.*;
import java.util.*;
import java.io.*;

/** Source-only Java AST scanner: parse syntax, never compile or execute upstream. */
public final class JavaRouteAstScanner {
  static void emit(String... cols) {
    StringJoiner out = new StringJoiner("\t");
    for (String c : cols) out.add((c==null?"":c).replace("\\","\\\\").replace("\t","\\t").replace("\n","\\n").replace("\r","\\r"));
    System.out.println(out);
  }
  public static void main(String[] args) throws Exception {
    if (args.length!=2) throw new IllegalArgumentException("usage: scanner ROOT PATH_MANIFEST");
    Path root=Paths.get(args[0]).toRealPath();
    List<String> paths=Files.readAllLines(Paths.get(args[1]));
    JavaCompiler javac=ToolProvider.getSystemJavaCompiler();
    if (javac==null) throw new IllegalStateException("JDK is required");
    DiagnosticCollector<JavaFileObject> errors=new DiagnosticCollector<>();
    try(StandardJavaFileManager fm=javac.getStandardFileManager(errors,Locale.ROOT,null)) {
      ArrayList<File> files=new ArrayList<>();
      for(String path:paths) {
        Path file=root.resolve(path).normalize();
        if(!file.startsWith(root)||!Files.isRegularFile(file))throw new IOException("invalid path "+path);
        files.add(file.toFile());
      }
      JavacTask task=(JavacTask)javac.getTask(null,fm,errors,List.of("-proc:none","--enable-preview","--source","21","-encoding","UTF-8","-Xlint:none"),null,fm.getJavaFileObjectsFromFiles(files));
      Trees trees=Trees.instance(task);
      for(CompilationUnitTree unit:task.parse()) {
        String path=root.relativize(Paths.get(unit.getSourceFile().toUri()).toRealPath()).toString().replace(File.separatorChar,'/');
        emit("FILE",path,"0","","","AST_PARSED");
        new TreePathScanner<Void,Void>() {
          Deque<String> cls=new ArrayDeque<>(), methods=new ArrayDeque<>();
          void emitNode(String type,Tree tree,String value) {
            long pos=trees.getSourcePositions().getStartPosition(unit,tree);
            long line=pos<0?-1:unit.getLineMap().getLineNumber(pos);
            emit(type,path,Long.toString(line),cls.isEmpty()?"":cls.peek(),methods.isEmpty()?"":methods.peek(),value);
          }
          @Override public Void visitClass(ClassTree n,Void p) {
            cls.push(cls.isEmpty()?n.getSimpleName().toString():cls.peek()+"."+n.getSimpleName());
            emitNode("CLASS",n,"kind="+n.getKind()+";extends="+n.getExtendsClause()+";implements="+n.getImplementsClause());
            try{return super.visitClass(n,p);}finally{cls.pop();}
          }
          @Override public Void visitMethod(MethodTree n,Void p) {
            methods.push(n.getName().toString());
            emitNode("METHOD",n,"name="+n.getName()+";modifiers="+n.getModifiers().getFlags());
            try{return super.visitMethod(n,p);}finally{methods.pop();}
          }
          @Override public Void visitAnnotation(AnnotationTree n,Void p) {
            emitNode("ANNOTATION",n,n.getAnnotationType().toString()+"||"+n.toString());
            return super.visitAnnotation(n,p);
          }
          @Override public Void visitMethodInvocation(MethodInvocationTree n,Void p) {
            String name=n.getMethodSelect().toString();
            if(name.matches("(?s).*(?:route|routes|register|addViewControllers|addResourceHandlers|registerMapping|addServlet|addFilter|addHandler|setUrlMap|setUrlMappings|addUrlMappings|addMapping|addPathPrefix)"))
              emitNode("CALL",n,n.toString());
            return super.visitMethodInvocation(n,p);
          }
          @Override public Void visitNewClass(NewClassTree n,Void p) {
            String name=n.getIdentifier().toString();
            if(name.matches("(?s).*(?:RouterFunction|HandlerMapping|ServletRegistrationBean|FilterRegistrationBean|Servlet|Filter).*"))
              emitNode("NEW",n,n.toString());
            return super.visitNewClass(n,p);
          }
        }.scan(unit,null);
      }
      for(Diagnostic<? extends JavaFileObject> e:errors.getDiagnostics())
        if(e.getKind()==Diagnostic.Kind.ERROR) {
          String path=e.getSource()==null?"":root.relativize(Paths.get(e.getSource().toUri()).toAbsolutePath().normalize()).toString().replace(File.separatorChar,'/');
          emit("ERROR",path,Long.toString(e.getLineNumber()),"","",e.getCode());
        }
    }
  }
}