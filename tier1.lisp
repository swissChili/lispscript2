#| import: import a JavaScript or Lisp module
 |#
(import (t0 "tier0")
        (readline "readline"))

#| defconstant: define a constant value that cannot be changed by
 |              setf or other
 |#
(defconstant pi 3.141592)

#| defvar: define a variable that is set only once. Calling defvar
 |         again on the same variable will not change it's value,
 |         but setf will
 |#
(defvar something 2)
(defvar something 3)

#| defun: define a function
 |#
(defun greet (name)
  (print "Hello" name))

#| lambda: define an anonymous function that can be bound to a
 |         variable or returned from a function
 |#
(defvar add-two
  (lambda (a b)
    (+ a b)))
