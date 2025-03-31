// PK Parameters
const PK = {
  ER: { peak1Time: 2, peak2Time: 6, halfLife: 3, peak1Ratio: 1.2, peak2Ratio: 0.8 },
  IR: { peakTime: 1.5, halfLife: 2.5, peakRatio: 1.5 }
};

// App State
let doses = [];
let nextId = 1;

// DOM Elements
const chartCtx = document.getElementById('ritalinChart').getContext('2d');
const addDoseBtn = document.getElementById('addDoseBtn');

// Initialize Chart
const chart = new Chart(chartCtx, {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        title: { display: true, text: 'Time (hours)' },
        ticks: { autoSkip: true, maxRotation: 0 }
      },
      y: { 
        title: { display: true, text: 'Concentration (ng/mL)' }, 
        min: 0 
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12
        }
      }
    }
  }
});

// Event Listeners
addDoseBtn.addEventListener('click', addNewDose);

// Core Functions
function calculateDose(dose, timePoints) {
  if (dose.type === "ER") {
    return timePoints.map(t => {
      const timeSinceDose = t - dose.time;
      if (timeSinceDose < 0) return 0;
      
      // First release phase
      const firstRelease = (timeSinceDose <= PK.ER.peak1Time) 
        ? dose.amount * PK.ER.peak1Ratio * (timeSinceDose / PK.ER.peak1Time) 
        : dose.amount * PK.ER.peak1Ratio * Math.exp(-Math.log(2) * (timeSinceDose - PK.ER.peak1Time) / PK.ER.halfLife);
      
      // Second release phase
      const secondReleaseTime = timeSinceDose - 4;
      let secondRelease = 0;
      if (secondReleaseTime > 0) {
        secondRelease = (secondReleaseTime <= (PK.ER.peak2Time - 4)) 
          ? dose.amount * PK.ER.peak2Ratio * (secondReleaseTime / (PK.ER.peak2Time - 4)) 
          : dose.amount * PK.ER.peak2Ratio * Math.exp(-Math.log(2) * (secondReleaseTime - (PK.ER.peak2Time - 4)) / PK.ER.halfLife);
      }
      return firstRelease + secondRelease;
    });
  } else {
    return timePoints.map(t => {
      const timeSinceDose = t - dose.time;
      if (timeSinceDose < 0) return 0;
      return (timeSinceDose <= PK.IR.peakTime) 
        ? dose.amount * PK.IR.peakRatio * (timeSinceDose / PK.IR.peakTime) 
        : dose.amount * PK.IR.peakRatio * Math.exp(-Math.log(2) * (timeSinceDose - PK.IR.peakTime) / PK.IR.halfLife);
    });
  }
}

function updateChart() {
  const timePoints = Array.from({ length: 25 }, (_, i) => i * 0.5);
  const totalConcentration = new Array(timePoints.length).fill(0);
  const datasets = [];

  doses.forEach((dose) => {
    const doseData = calculateDose(dose, timePoints);
    datasets.push({
      label: `${dose.type} ${dose.amount}mg at ${dose.time}h`,
      data: doseData,
      borderColor: dose.color,
      borderDash: dose.type === "IR" ? [3, 3] : [5, 5],
      tension: 0.2,
      pointRadius: 0
    });
    doseData.forEach((val, j) => totalConcentration[j] += val);
  });

  datasets.unshift({
    label: 'Total Concentration',
    data: totalConcentration,
    borderColor: '#36A2EB',
    backgroundColor: 'rgba(54, 162, 235, 0.1)',
    tension: 0.2,
    fill: true
  });

  chart.data.labels = timePoints;
  chart.data.datasets = datasets;
  chart.update();
}

function renderDosesList() {
  const tableBody = document.getElementById('dosesList');
  tableBody.innerHTML = doses.map(dose => `
    <tr data-id="${dose.id}">
      <td class="dose-type">
        <select class="edit-type" onchange="updateDose(${dose.id})">
          <option value="ER" ${dose.type === 'ER' ? 'selected' : ''}>ER</option>
          <option value="IR" ${dose.type === 'IR' ? 'selected' : ''}>IR</option>
        </select>
      </td>
      <td><input type="number" class="edit-time" value="${dose.time}" step="0.5" min="0" onchange="updateDose(${dose.id})"></td>
      <td><input type="number" class="edit-amount" value="${dose.amount}" min="1" onchange="updateDose(${dose.id})"></td>
      <td><input type="color" class="edit-color" value="${dose.color}" onchange="updateDose(${dose.id})"></td>
      <td class="actions"><button onclick="deleteDose(${dose.id})">Delete</button></td>
    </tr>
  `).join('');
}

function updateDose(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const doseIndex = doses.findIndex(d => d.id
