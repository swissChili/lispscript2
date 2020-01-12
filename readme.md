# lispscript 2

```lisp
(defparameter *lispscript* "a lisp -> JS compiler for frontend development")
(format t "~A~%" *lispscript*)
```

This is a rewrite of the original lispscript (written in haskell) in JS
and Lisp.

## Example

```lisp
;; Calculate the nth fibonacci number
(defun fib (n)
  (if (<= n 2)
    1
    (+ (fib (- n 1))
       (fib (- n 2)))))

(print (fib 12))
; 144
```

## Roadmap

- Implement more powerful macros
  - right now only js macros exist, which are handy for bootstrapping but
    lack the real power of lisp macros.
