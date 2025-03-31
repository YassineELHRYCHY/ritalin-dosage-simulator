// PK Parameters (customizable based on metabolism and dose type)
let PK = {
  ER: { peak1Time: 2, peak2Time: 6, halfLife: 3, peak1Ratio: 1.2, peak2Ratio: 0.8 },
  IR: { peakTime: 1.5, halfLife: 2.5, peakRatio: 1.5 }
};

// Metabolism presets
const METABOLISM_PRESETS = {
  slow:    { ER: { peak1Time: 2.5, peak2Time: 7, halfLife: 4 }, IR: { peakTime: 2, halfLife: 3.5 } },
  medium:  { ER: { peak1Time: 2,   peak2Time: 6, halfLife: 3 }, IR: { peakTime: 1.5, halfLife: 2.5 } },
  fast:    { ER: { peak1Time: 1.5, peak2Time: 5, halfLife: 2 }, IR: { peakTime: 1, halfLife: 2 } }
};

// Store doses as {id, type, time, amount, color}
let doses = [];
let nextId = 1;
let editingId = null;

// DOM Elements
const metabolismSpeedSelect = document.getElementById('metabolismSpeed');
const pkParamsDisplay = document.getElementById('pkParamsDisplay');
const doseTypeSelect = document.getElementById('doseType');
const doseTimeInput = document.getElementById('doseTime');
const doseAmountInput = document.getElementById('doseAmount');
const doseColorInput = document.getElementById('doseColor');
const addDoseBtn = document.getElementById('addDoseBtn');
const clearDosesBtn = document.getElementById('clearDosesBtn');
const dosesList = document.getElementById('dosesList');

// Initialize Chart
const ctx = document.getElementById('ritalinChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: 'Time (hours)', color: '#555' },
        ticks: { autoSkip: true, maxRotation: 0, color: '#555' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        title: { display: true, text: 'Concentration (ng/mL)', color: '#555' },
        min: 0,
        ticks: { color: '#555' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#555' }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} ng/mL`
        }
      }
    },
    interaction: {
      mode: 'nearest',
      intersect: false
    }
  }
});

// Event Listeners
metabolismSpeedSelect.addEventListener('change', updatePKParams);
addDoseBtn.addEventListener('click', addOrUpdateDose);
clearDosesBtn.addEventListener('click', clearDoses);

// Update PK parameters based on metabolism speed
function updatePKParams() {
  const speed = metabolismSpeedSelect.value;
  PK.ER = { ...PK.ER, ...METABOLISM_PRESETS[speed].ER };
  PK.IR = { ...PK.IR, ...METABOLISM_PRESETS[speed].IR };
  
  pkParamsDisplay.innerHTML = `
    ER: Peak 1=${PK.ER.peak1Time}h, Peak 2=${PK.ER.peak2Time}h, t½=${PK.ER.halfLife}h<br>
    IR: Peak=${PK.IR.peakTime}h, t½=${PK.IR.halfLife}h
  `;
  updateChart();
}

// Calculate concentration for a single dose (ER or IR)
function calculateDose(dose, timePoints) {
  if (dose.type === "ER") {
    return timePoints.map(t => {
      const timeSinceDose = t - dose.time;
      if (timeSinceDose < 0) return 0;

      // First release phase
      const firstRelease = (timeSinceDose <= PK.ER.peak1Time) 
        ? dose.amount * PK.ER.peak1Ratio * (timeSinceDose / PK.ER.peak1Time) 
        : dose.amount * PK.ER.peak1Ratio * Math.exp(-Math.log(2) * (timeSinceDose - PK.ER.peak1Time) / PK.ER.halfLife);

      // Second release phase (starts after 4h)
      const secondReleaseTime = timeSinceDose - 4;
      let secondRelease = 0;
      if (secondReleaseTime > 0) {
        secondRelease = (secondReleaseTime <= (PK.ER.peak2Time - 4)) 
          ? dose.amount * PK.ER.peak2Ratio * (secondReleaseTime / (PK.ER.peak2Time - 4)) 
          : dose.amount * PK.ER.peak2Ratio * Math.exp(-Math.log(2) * (secondReleaseTime - (PK.ER.peak2Time - 4)) / PK.ER.halfLife);
      }

      return firstRelease + secondRelease;
    });
  } else { // IR
    return timePoints.map(t => {
      const timeSinceDose = t - dose.time;
      if (timeSinceDose < 0) return 0;

      // Single peak for IR
      return (timeSinceDose <= PK.IR.peakTime) 
        ? dose.amount * PK.IR.peakRatio * (timeSinceDose / PK.IR.peakTime) 
        : dose.amount * PK.IR.peakRatio * Math.exp(-Math.log(2) * (timeSinceDose - PK.IR.peakTime) / PK.IR.halfLife);
    });
  }
}

// Update the chart with current doses
function updateChart() {
  const timePoints = Array.from({ length: 25 }, (_, i) => i * 0.5); // 0h to 12h, every 30min
  const totalConcentration = new Array(timePoints.length).fill(0);
  const datasets = [];

  // Add individual doses and sum totals
  doses.forEach((dose) => {
    const doseData = calculateDose(dose, timePoints);
    datasets.push({
      label: `${dose.type} ${dose.amount}mg at ${dose.time}h`,
      data: doseData,
      borderColor: dose.color,
      borderWidth: 2,
      borderDash: dose.type === "IR" ? [3, 3] : [],
      tension: 0.2,
      pointRadius: 0
    });

    // Sum to total concentration
    doseData.forEach((val, j) => totalConcentration[j] += val);
  });

  // Add total concentration line
  datasets.unshift({
    label: 'Total Concentration',
    data: totalConcentration,
    borderColor: '#36A2EB',
    backgroundColor: 'rgba(54, 162, 235, 0.1)',
    borderWidth: 3,
    tension: 0.2,
    fill: true
  });

  // Update chart
  chart.data.labels = timePoints;
  chart.data.datasets = datasets;
  chart.update();
}

// Render the doses list table
function renderDosesList() {
  dosesList.innerHTML = doses.map(dose => `
    <tr>
      <td class="type-col">${dose.type}</td>
      <td class="time-col">${dose.time}</td>
      <td class="amount-col">${dose.amount}</td>
      <td class="color-col"><input type="color" value="${dose.color}" disabled></td>
      <td class="actions-col">
        <button onclick="editDose(${dose.id})">Edit</button>
        <button onclick="deleteDose(${dose.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Add or update a dose
function addOrUpdateDose() {
  const type = doseTypeSelect.value;
  const time = parseFloat(doseTimeInput.value);
  const amount = parseFloat(doseAmountInput.value);
  const color = doseColorInput.value;

  if (editingId !== null) {
    // Update existing dose
    const doseIndex = doses.findIndex(d => d.id === editingId);
    if (doseIndex !== -1) {
      doses[doseIndex] = { id: editingId, type, time, amount, color };
    }
    editingId = null;
    addDoseBtn.textContent = "Add Dose";
  } else {
    // Add new dose
    doses.push({ id: nextId++, type, time, amount, color });
  }

  updateChart();
  renderDosesList();
  resetForm();
}

// Edit a dose (load into form)
function editDose(id) {
  const dose = doses.find(d => d.id === id);
  if (dose) {
    doseTypeSelect.value = dose.type;
    doseTimeInput.value = dose.time;
    doseAmountInput.value = dose.amount;
    doseColorInput.value = dose.color;
    editingId = id;
    addDoseBtn.textContent = "Update Dose";
  }
}

// Delete a dose
function deleteDose(id) {
  doses = doses.filter(d => d.id !== id);
  updateChart();
  renderDosesList();
  if (editingId === id) {
    editingId = null;
    resetForm();
    addDoseBtn.textContent = "Add Dose";
  }
}

// Clear all doses
function clearDoses() {
  doses = [];
  editingId = null;
  updateChart();
  renderDosesList();
  resetForm();
  addDoseBtn.textContent = "Add Dose";
}

// Reset the form
function resetForm() {
  doseTimeInput.value = 0;
  doseAmountInput.value = 10;
  doseColorInput.value = "#FF6384";
}

// Initialize
updatePKParams();
doses.push({ id: nextId++, type: "ER", time: 0, amount: 10, color: "#FF6384" });
updateChart();
renderDosesList();
