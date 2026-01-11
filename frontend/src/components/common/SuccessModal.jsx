import React from 'react';
import { Dialog, DialogContent, Typography, Zoom } from '@mui/material';
import '../../styles/Modales.css';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Zoom ref={ref} {...props} />;
});

const SuccessModal = ({ open, onClose, message, type = 'success' }) => {
    const isError = type === 'error';
    const title = isError ? '¡Error!' : '¡Completado!';
    const circleClass = isError ? 'error-circle' : 'check-circle';
    const crossTickClass = isError ? 'error-cross' : 'check-tick';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            PaperProps={{ className: 'custom-modal-paper' }}
            slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
            sx={{ zIndex: 1400 }}
        >
            <DialogContent className="success-modal-content">
                <div className="success-checkmark">
                    <svg className="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className={circleClass} cx="26" cy="26" r="25" fill="none" />
                        {isError ? (
                            <>
                                <path className={crossTickClass} fill="none" d="M16 16 36 36" />
                                <path className={crossTickClass} fill="none" d="M36 16 16 36" />
                            </>
                        ) : (
                            <path className={crossTickClass} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        )}
                    </svg>
                </div>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: isError ? '#d32f2f' : '#1a1a1a', mb: 1 }}>
                    {title}
                </Typography>
                <Typography variant="body1" sx={{ color: '#666' }}>
                    {message}
                </Typography>
            </DialogContent>
        </Dialog>
    );
};

export default SuccessModal;
