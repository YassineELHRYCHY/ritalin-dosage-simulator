/* Base Styles */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f7fa;
    color: #333;
  }
  
  .container {
    max-width: 1000px;
    margin: 0 auto;
    background: white;
    padding: 25px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  
  h1, h3 {
    color: #2c3e50;
  }
  
  /* Controls */
  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 20px 0;
    padding: 15px;
    background: #ecf0f1;
    border-radius: 8px;
  }
  
  .metabolism-control {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  select {
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #bdc3c7;
  }
  
  .params-display {
    font-size: 0.9em;
    color: #7f8c8d;
  }
  
  /* Buttons */
  .primary-btn {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .primary-btn:hover {
    background-color: #2980b9;
  }
  
  .delete-btn {
    background-color: #e74c3c;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
  }
  
  /* Chart */
  .chart-container {
    width: 100%;
    height: 400px;
    margin: 20px 0;
    background: white;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  /* Table */
  .dose-table-container {
    margin-top: 30px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  th {
    background-color: #3498db;
    color: white;
  }
  
  tr:nth-child(even) {
    background-color: #f2f2f2;
  }
  
  tr:hover {
    background-color: #e6f7ff;
  }
  
  /* Form Elements */
  input[type="number"] {
    width: 70px;
    padding: 6px;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
  }
  
  input[type="color"] {
    width: 40px;
    height: 30px;
    padding: 2px;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
  }
  
  select.edit-type {
    padding: 6px;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .controls {
      flex-direction: column;
      gap: 15px;
      align-items: flex-start;
    }
    
    td, th {
      padding: 8px 10px;
      font-size: 0.9em;
    }
    
    input[type="number"] {
      width: 60px;
    }
  }
