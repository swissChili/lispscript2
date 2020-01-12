(defjsmacro print (stuff)
  "console.log(" stuff ")")

(defjsmacro car (list)
  list "[0]")

(defjsmacro cdr (list)
  list ".slice(1)")

(defjsmacro cons (a b)
  b ".unshift(" a ")")

(defjsmacro map (list lambda)
  list ".map(" lambda ")")

(defjsmacro reduce (list lambda)
  list ".reduce(" lambda ")")

(defjsmacro filter (list lambda)
  list ".filter(" lambda ")")

(defjsmacro to-string (val)
  "String(" val ")")
