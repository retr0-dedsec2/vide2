# Bridge Core v1 design

Core rule: ChatGPT expresses intent; Bridge owns execution. Prefer native API > browser DOM > Windows UI Automation > vision > coordinates. Every meaningful action is permission-checked, executed, verified, journaled, and returned as a structured result. External writes require exact-action approval by default; financial operations are denied by default. Secrets stay local whenever possible. The daemon initiates outbound relay connectivity so the PC needs no public inbound port.
