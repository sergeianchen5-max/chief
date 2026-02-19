import React, { useState } from 'react';
import { FamilyMember, GoalType, Gender, ActivityLevel } from '../types';
import { Users, Plus, X, HeartPulse, Edit2, Save, Ruler, Weight, Activity } from 'lucide-react';

interface FamilyPanelProps {
  family: FamilyMember[];
  setFamily: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
}

export const FamilyPanel: React.FC<FamilyPanelProps> = ({ family, setFamily }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState<Gender>(Gender.FEMALE);
  const [newHeight, setNewHeight] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newActivity, setNewActivity] = useState<ActivityLevel>(ActivityLevel.MODERATE);
  const [newGoal, setNewGoal] = useState<GoalType>(GoalType.GENERAL_HEALTH);
  const [newPreferences, setNewPreferences] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const handleSaveMember = () => {
    if (!newName.trim()) return;

    const age = parseInt(newAge) || 25;
    const height = parseInt(newHeight) || 170;
    const weight = parseInt(newWeight) || 70;

    const memberData = {
        name: newName,
        age,
        gender: newGender,
        height,
        weight,
        activityLevel: newActivity,
        goal: newGoal,
        preferences: newPreferences,
        deadline: newDeadline
    };

    if (editingId) {
        // Edit Mode
        setFamily(prev => prev.map(m => {
            if (m.id === editingId) {
                return { ...m, ...memberData };
            }
            return m;
        }));
    } else {
        // Create Mode
        const member: FamilyMember = {
            id: Date.now().toString(),
            ...memberData
        };
        setFamily([...family, member]);
    }
    
    resetForm();
  };

  const handleEditClick = (member: FamilyMember) => {
      setNewName(member.name);
      setNewAge(member.age.toString());
      setNewGender(member.gender || Gender.FEMALE);
      setNewHeight(member.height?.toString() || '');
      setNewWeight(member.weight?.toString() || '');
      setNewActivity(member.activityLevel || ActivityLevel.MODERATE);
      setNewGoal(member.goal);
      setNewPreferences(member.preferences);
      setNewDeadline(member.deadline || '');
      setEditingId(member.id);
      setIsAdding(true);
  };

  const resetForm = () => {
    setNewName('');
    setNewAge('');
    setNewGender(Gender.FEMALE);
    setNewHeight('');
    setNewWeight('');
    setNewActivity(ActivityLevel.MODERATE);
    setNewGoal(GoalType.GENERAL_HEALTH);
    setNewPreferences('');
    setNewDeadline('');
    setEditingId(null);
    setIsAdding(false);
  };

  const removeMember = (id: string) => {
    if (window.confirm("Удалить профиль?")) {
        setFamily(family.filter(f => f.id !== id));
    }
  };

  // --- CALCULATION HELPER (Mifflin-St Jeor) ---
  const calculateNeeds = (member: FamilyMember) => {
      let bmr = 0;
      if (member.gender === Gender.MALE) {
          bmr = (10 * member.weight) + (6.25 * member.height) - (5 * member.age) + 5;
      } else {
          bmr = (10 * member.weight) + (6.25 * member.height) - (5 * member.age) - 161;
      }

      let multiplier = 1.2;
      if (member.activityLevel.includes('1.375')) multiplier = 1.375;
      if (member.activityLevel.includes('1.55')) multiplier = 1.55;
      if (member.activityLevel.includes('1.725')) multiplier = 1.725;
      if (member.activityLevel.includes('1.9')) multiplier = 1.9;

      let tdee = Math.round(bmr * multiplier);

      // Adjust for Goal
      if (member.goal === GoalType.WEIGHT_LOSS) tdee -= 400;
      if (member.goal === GoalType.MUSCLE_GAIN) tdee += 300;

      return { tdee, bmr };
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6 text-green-600">
        <Users size={24} />
        <h2 className="text-xl font-bold text-gray-800">Семья и Цели</h2>
      </div>

      {isAdding ? (
        <div className="space-y-3 bg-gray-50 p-4 rounded-xl mb-4 border border-green-100 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{editingId ? 'Редактирование' : 'Новый профиль'}</span>
          </div>
          
          <input
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="Имя"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              className="p-2 border rounded-lg text-sm bg-white"
              value={newGender}
              onChange={e => setNewGender(e.target.value as Gender)}
            >
              {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input
              className="p-2 border rounded-lg"
              placeholder="Возраст"
              type="number"
              value={newAge}
              onChange={e => setNewAge(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
                <input
                    className="w-full p-2 border rounded-lg pl-8"
                    placeholder="Рост (см)"
                    type="number"
                    value={newHeight}
                    onChange={e => setNewHeight(e.target.value)}
                />
                <Ruler size={14} className="absolute left-2.5 top-3 text-gray-400" />
            </div>
            <div className="relative">
                <input
                    className="w-full p-2 border rounded-lg pl-8"
                    placeholder="Вес (кг)"
                    type="number"
                    value={newWeight}
                    onChange={e => setNewWeight(e.target.value)}
                />
                <Weight size={14} className="absolute left-2.5 top-3 text-gray-400" />
            </div>
          </div>

          <select
              className="w-full p-2 border rounded-lg text-sm bg-white"
              value={newActivity}
              onChange={e => setNewActivity(e.target.value as ActivityLevel)}
            >
              {Object.values(ActivityLevel).map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
              className="w-full p-2 border rounded-lg text-sm bg-white font-medium text-green-700"
              value={newGoal}
              onChange={e => setNewGoal(e.target.value as GoalType)}
            >
              {Object.values(GoalType).map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <input
            className="w-full p-2 border rounded-lg"
            placeholder="Предпочтения / Аллергии"
            value={newPreferences}
            onChange={e => setNewPreferences(e.target.value)}
          />
          <input
            className="w-full p-2 border rounded-lg"
            placeholder="Срок цели (опционально)"
            value={newDeadline}
            onChange={e => setNewDeadline(e.target.value)}
          />

          <div className="flex gap-2 pt-2">
            <button onClick={handleSaveMember} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95">
                <Save size={16} /> Сохранить
            </button>
            <button onClick={resetForm} className="px-4 py-2 text-gray-500 hover:bg-gray-200 rounded-lg">Отмена</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 border-2 border-dashed border-green-200 text-green-600 rounded-xl mb-4 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Добавить члена семьи
        </button>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {family.map(member => {
          const { tdee } = calculateNeeds(member);
          return (
            <div key={member.id} className="p-4 border border-gray-100 rounded-xl relative hover:shadow-md transition-shadow group bg-stone-50/50">
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg backdrop-blur-sm pl-2">
                    <button onClick={() => handleEditClick(member)} className="text-gray-400 hover:text-blue-500 p-1.5">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => removeMember(member.id)} className="text-gray-400 hover:text-red-500 p-1.5">
                        <X size={14} />
                    </button>
                </div>
                
                <div className="flex items-start justify-between mb-2 pr-12">
                   <div>
                       <h3 className="font-bold text-gray-800 flex items-center gap-2">
                           {member.name} 
                           {member.gender === Gender.MALE ? <span className="text-blue-400 text-[10px]">♂</span> : <span className="text-pink-400 text-[10px]">♀</span>}
                       </h3>
                       <p className="text-xs text-gray-500">{member.age} лет, {member.weight}кг / {member.height}см</p>
                   </div>
                   <div className="text-right">
                       <span className="block text-lg font-extrabold text-green-600 leading-none">~{tdee}</span>
                       <span className="text-[10px] text-gray-400 uppercase font-bold">ккал/день</span>
                   </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-600 font-medium mb-1.5 bg-white px-2 py-1 rounded border border-gray-100 w-fit">
                    <HeartPulse size={12} className="text-red-400" /> {member.goal}
                </div>
                
                {member.preferences && <p className="text-xs text-gray-500 mt-1 italic">⚠️ {member.preferences}</p>}
            </div>
          );
        })}
        {family.length === 0 && !isAdding && (
            <div className="text-center text-gray-400 text-sm mt-8 border-2 border-dashed border-gray-100 rounded-xl p-6">
                <p>Список пуст.</p>
                <p className="text-xs mt-1">Добавьте профили для расчета КБЖУ</p>
            </div>
        )}
      </div>
    </div>
  );
};