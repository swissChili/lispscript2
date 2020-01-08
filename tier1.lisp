(defparameter *something* "Hello")

(defmacro import (package)
  `(defparameter ,package (require ,package)))

(import fs)

(defun -parse (input)
  (if input
    (progn
      '(console.log "cringe")
      (console.log input)
      2)
    3))

(-parse (fs.readFileSync "tier1.lisp"))
