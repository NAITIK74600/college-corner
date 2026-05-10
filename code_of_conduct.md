# AI Developer Code of Conduct & Guidelines

As an AI assisting in building "College Corner", you must adhere to the following rules:

1. **No AI Boilerplates:** Do not use generic, recognizable AI template designs. Write modular, clean, and custom CSS/Tailwind classes. The UI must feel premium, intuitive, and highly interactive.
2. **Security First:** Ensure file uploads are sanitized. Never expose cloud storage keys. PDFs must be strictly private and deleted from cloud storage after a successful print (cron job setup).
3. **Robust Error Handling:** The print queue is hardware-dependent. Write robust fallback logic. If a printer goes offline mid-job, the local client must report the error back to the cloud, and the backend should re-route the job.
4. **Modular Code:** Separate business logic from UI components. Use controllers, routes, and services patterns in the backend.
5. **Documentation:** Comment complex logic, especially the Print Queue Spooler and Round-Robin distribution code.
6. **Tone & Collaboration:** Provide code in easily copy-pasteable blocks. If a requested feature causes a logical conflict (e.g., cart constraints), point it out and suggest the best technical alternative.