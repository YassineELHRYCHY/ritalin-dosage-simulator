// ========== CONSTANTS ==========
const METABOLISM_PRESETS = {
  slow: {
    ER: { peak1Time: 2.5, peak2Time: 7, halfLife: 4 },
    IR: { peakTime: 2, halfLife: 3.5 }
  },
  medium: {
    ER: { peak1Time: 2, peak2Time: 6, halfLife: 3 },
    IR: { peakTime: 1.5, halfLife: 2.5 }
  },
  fast: {
    ER: { peak1Time: 1.5, peak2Time: 5, halfLife: 2 },
    IR: { peakTime: 1, halfLife: 2 }
  }
};

const PK = {
  ER: { ...METABOLISM_PRESETS.medium.ER, peak1Ratio: 1.2, peak2Ratio: 0.8 },
  IR: { ...METABOLISM_PRESETS.medium.IR, peakRatio: 1.5 }
};

// ========== STATE ==========
let doses = [];
let nextId = 1;

// ========== DOM ELEMENTS ==========
const chartCtx = document.getElementById('ritalinChart').getContext('2d');
const metabolismSelect = document.getElementById('metabolismSpeed');
const pkParamsDisplay = document.getElementById('pkParamsDisplay');
const addDoseBtn = document.getElementById('addDoseBtn');

// ========== CHART INIT ==========
const chart = new Chart(chartCtx, {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300
    },
    scales: {
      x: { 
        title: { 
          display: true, 
          text: 'Time (hours)',
          font: { weight: 'bold' }
        },
        ticks: { 
          autoSkip: true,
          maxRotation: 0
        }
      },
      y: { 
        title: { 
          display: true, 
          text: 'Concentration (ng/mL)',
          font: { weight: 'bold' }
        },
        min: 0,
        ticks: {
          callback: function(value) {
            return value.toFixed(1);
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          font: { size: 12 },
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => 
            `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ng/mL`
        }
      }
    }
  }
});

// ========== EVENT LISTENERS ==========
metabolismSelect.addEventListener('change', updateMetabolism);
addDoseBtn.addEventListener('click', addNewDose);

// ========== CORE FUNCTIONS ==========
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
  const timePoints = Array.from({ length: 49 }, (_, i) => i * 0.25); // Higher resolution (every 15min)
  const totalConcentration = new Array(timePoints.length).fill(0);
  const datasets = [];

  doses.forEach((dose) => {
    const doseData = calculateDose(dose, timePoints);
    datasets.push({
      label: `${dose.type} ${dose.amount}mg @ ${dose.time}h`,
      data: doseData,
      borderColor: dose.color,
      borderWidth: 2,
      borderDash: dose.type === "IR" ? [3, 3] : [],
      tension: 0.2,
      pointRadius: 0
    });
    doseData.forEach((val, j) => totalConcentration[j] += val);
  });

  datasets.unshift({
    label: 'Total Concentration',
    data: totalConcentration,
    borderColor: '#2c3e50',
    backgroundColor: 'rgba(44, 62, 80, 0.1)',
    borderWidth: 3,
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
      <td>
        <select class="edit-type" onchange="handleDoseUpdate(${dose.id})">
          <option value="ER" ${dose.type === 'ER' ? 'selected' : ''}>ER</option>
          <option value="IR" ${dose.type === 'IR' ? 'selected' : ''}>IR</option>
        </select>
      </td>
      <td>
        <input type="number" class="edit-time" value="${dose.time}" step="0.25" min="0" 
               onchange="handleDoseUpdate(${dose.id})">
      </td>
      <td>
        <input type="number" class="edit-amount" value="${dose.amount}" min="0.1" step="0.1"
               onchange="handleDoseUpdate(${dose.id})">
      </td>
      <td>
        <input type="color" class="edit-color" value="${dose.color}" 
               onchange="handleDoseUpdate(${dose.id})">
      </td>
      <td>
        <button class="delete-btn" onclick="deleteDose(${dose.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ========== STATE MANAGEMENT ==========
function updateMetabolism() {
  const speed = metabolismSelect.value;
  Object.assign(PK.ER, METABOLISM_PRESETS[speed].ER);
  Object.assign(PK.IR, METABOLISM_PRESETS[speed].IR);
  
  pkParamsDisplay.textContent = 
    `ER: Peak1=${PK.ER.peak1Time}h, Peak2=${PK.ER.peak2Time}h, t½=${PK.ER.halfLife}h | 
     IR: Peak=${PK.IR.peakTime}h, t½=${PK.IR.halfLife}h`;
  
  updateChart();
}

function handleDoseUpdate(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const doseIndex = doses.findIndex(d => d.id === id);
  
  doses[doseIndex] = {
    id,
    type: row.querySelector('.edit-type').value,
    time: parseFloat(row.querySelector('.edit-time').value),
    amount: parseFloat(row.querySelector('.edit-amount').value),
    color: row.querySelector('.edit-color').value
  };
  
  updateChart();
}

function addNewDose() {
  const newDose = {
    id: nextId++,
    type: "ER",
    time: doses.length > 0 ? doses[doses.length-1].time + 1 : 0,
    amount: 10,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`
  };
  doses.push(newDose);
  renderDosesList();
  updateChart();
}

function deleteDose(id) {
  doses = doses.filter(d => d.id !== id);
  renderDosesList();
  updateChart();
}

// ========== INITIALIZATION ==========
updateMetabolism();
addNewDose(); // Start with one default dose
