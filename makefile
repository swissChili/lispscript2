deps = tier1.0.js

all: $(deps)

%.0.js: %.lisp
	node tier0.js $^ > $@

clean:
	rm -f $(deps)
