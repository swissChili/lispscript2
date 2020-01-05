# lispscript 2

```lisp
(defparameter *lispscript* "a lisp -> JS compiler for frontend development")
(format t "~A~%" *lispscript*)
```

This is a rewrite of the original lispscript (written in haskell) in JS
and Lisp.

## Building

Use the makefile in this repository to bootstrap the compiler.

## Progress

So far tier0 is implemented almost completely in JS, and tier1 (lisp bootstrap)
is in progress.

## Roadmap

- Implement macros
  - This will allow much of the language to be bootstrapped
- Implement lambdas
