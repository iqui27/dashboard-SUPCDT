#!/bin/bash
find src -type f -name "*.tsx" -exec sed -i '' \
  -e 's/bg-neutral-950/bg-background/g' \
  -e 's/text-neutral-50/text-foreground/g' \
  -e 's/bg-neutral-900/bg-card/g' \
  -e 's/border-white\/10/border-border/g' \
  -e 's/border-neutral-700/border-border border-dashed/g' \
  -e 's/bg-neutral-800/bg-muted/g' \
  -e 's/text-neutral-400/text-muted-foreground/g' \
  -e 's/text-neutral-500/text-muted-foreground/g' \
  -e 's/text-neutral-300/text-muted-foreground/g' \
  -e 's/text-neutral-200/text-foreground/g' \
  -e 's/bg-black\/50/bg-background\/80/g' \
  -e 's/hover:bg-white\/5/hover:bg-accent hover:text-accent-foreground/g' \
  -e 's/hover:text-white/hover:text-foreground/g' \
  -e 's/text-white/text-foreground/g' \
  -e 's/bg-blue-600 text-foreground/bg-blue-600 text-white/g' \
  {} +
