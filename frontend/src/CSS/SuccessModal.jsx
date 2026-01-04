import React from 'react';
import { Dialog, DialogContent, Typography, Zoom } from '@mui/material';
import '../CSS/Modales.css';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Zoom ref={ref} {...props} />;
});

const SuccessModal = ({ open, onClose, message }) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            keepMounted
            PaperProps={{ className: 'custom-modal-paper' }}
            slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
        >
            <DialogContent className="success-modal-content">
                <div className="success-checkmark">
                    <svg className="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="check-circle" cx="26" cy="26" r="25" fill="none" />
                        <path className="check-tick" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                </div>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
                    ¡Completado!
                </Typography>
                <Typography variant="body1" sx={{ color: '#666' }}>
                    {message}
                </Typography>
            </DialogContent>
        </Dialog>
    );
};

export default SuccessModal;
