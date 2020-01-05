(defparameter *something* "Hello")

(defun -parse (input)
  (console.log input))

(-parse (fs.readFileSync "tier1.lisp"))