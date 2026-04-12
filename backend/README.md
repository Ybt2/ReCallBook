Upload de pdf

curl -X POST http://localhost:3000/api/documents/upload ^
-F "notebookId=1" ^
-F "file=@D:/programming_projects/sites/PAP/ReCallBook/backend/uploads/mario.pdf"

Criação de quiz

curl -X POST http://localhost:3000/api/tools/quiz -H "Content-Type: application/json" -d "{\"docId\": \"uuid-gerado\", \"numQuestions\": 3}"

Exemplo
curl -X POST http://localhost:3000/api/tools/quiz -H "Content-Type: application/json" -d "{\"docId\": \"9bc13bc4-25c3-4796-91a2-22e6b6cd2b70\", \"numQuestions\": 3}"