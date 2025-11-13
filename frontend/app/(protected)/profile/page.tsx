"use client";

import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/providers/GlobalProvider';
import { FaTrash, FaPlus } from 'react-icons/fa';

interface IBusinessProfile {
  _id: string;
  accountName: string;
  brandName: string;
  gstin: string;
}

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<IBusinessProfile[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newGstin, setNewGstin] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/profiles');
        setProfiles(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch profiles.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleAddProfile = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsAdding(true);
    
    try {
      const { data } = await api.post('/profiles', {
        accountName: newAccountName,
        brandName: newBrandName,
        gstin: newGstin,
      });
      setProfiles([...profiles, data]);
      setSuccess(`Successfully added account: ${data.brandName}`);
      setNewAccountName('');
      setNewBrandName('');
      setNewGstin('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add profile.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) return;
    
    clearMessages();
    try {
      await api.delete(`/profiles/${profileId}`);
      setProfiles(profiles.filter(p => p._id !== profileId));
      setSuccess('Account deleted successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete profile.');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>User Profile</h1>
      <p style={styles.subHeader}>Manage your business accounts and GSTINs.</p>

      <form onSubmit={handleAddProfile} style={styles.form}>
        <h2 style={styles.formHeader}>Add New Account</h2>
        <div style={styles.inputRow}>
          <input
            type="text"
            placeholder="Account Name (e.g., My Meesho Store)"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Brand Name (e.g., Hemant's Apparel)"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="text"
            placeholder="GSTIN"
            value={newGstin}
            onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
            required
            style={styles.input}
            maxLength={15}
          />
          <button type="submit" disabled={isAdding} style={styles.addButton}>
            {isAdding ? 'Adding...' : <><FaPlus style={{ marginRight: '8px' }} /> Add</>}
          </button>
        </div>
      </form>
      
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      <div style={styles.profileList}>
        <h2 style={styles.listHeader}>Your Accounts</h2>
        {loading ? (
          <p>Loading accounts...</p>
        ) : profiles.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Account Name</th>
                <th style={styles.th}>Brand Name</th>
                <th style={styles.th}>GSTIN</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(profile => (
                <tr key={profile._id}>
                  <td style={styles.td}>{profile.accountName}</td>
                  <td style={styles.td}>{profile.brandName}</td>
                  <td style={styles.td}>{profile.gstin}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleDeleteProfile(profile._id)} style={styles.deleteButton} title="Delete Account">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={styles.noItems}>No accounts found. Add one using the form above to get started.</p>
        )}
      </div>
    </div>
  );
}

// Styling to match your app's theme
const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '2rem', fontFamily: 'sans-serif', color: '#333' },
  header: { fontSize: '2rem', fontWeight: 'bold', borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#1a202c'},
  subHeader: { color: '#718096', marginTop: '5px' },
  form: { backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', marginTop: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
  formHeader: { marginTop: 0, marginBottom: '1rem', fontSize: '1.2rem', color: '#2d3748'},
  inputRow: { display: 'flex', gap: '1rem', alignItems: 'center' },
  input: { flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #cbd5e0' },
  addButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 15px', backgroundColor: '#5c67f2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', transition: 'background-color 0.2s'},
  error: { color: '#c53030', marginTop: '1rem', backgroundColor: '#fed7d7', padding: '10px', borderRadius: '5px', border: '1px solid #f56565' },
  success: { color: '#2f855a', marginTop: '1rem', backgroundColor: '#c6f6d5', padding: '10px', borderRadius: '5px', border: '1px solid #68d391' },
  profileList: { marginTop: '3rem' },
  listHeader: { borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#2d3748'},
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  th: { textAlign: 'left', padding: '12px', backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0', color: '#4a5568', textTransform: 'uppercase', fontSize: '0.8rem' },
  td: { padding: '12px', borderBottom: '1px solid #edf2f7' },
  deleteButton: { backgroundColor: 'transparent', color: '#e53e3e', border: 'none', borderRadius: '5px', padding: '8px 10px', cursor: 'pointer', fontSize: '1rem' },
  noItems: { padding: '20px', textAlign: 'center', backgroundColor: '#f7fafc', borderRadius: '8px', marginTop: '1rem' },
};