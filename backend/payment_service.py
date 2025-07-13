import mercadopago
import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import hashlib
import hmac
import json

logger = logging.getLogger(__name__)

class MercadoPagoService:
    def __init__(self, access_token: str):
        self.sdk = mercadopago.SDK(access_token)
        self.access_token = access_token
    
    async def create_payment_preference(self, 
                                      amount: float, 
                                      description: str, 
                                      external_reference: str,
                                      user_email: str,
                                      notification_url: str = None) -> Dict[str, Any]:
        """Create a payment preference for MercadoPago checkout"""
        try:
            preference_data = {
                "items": [{
                    "title": description,
                    "quantity": 1,
                    "unit_price": amount,
                    "currency_id": "BRL"  # Can be configured
                }],
                "payer": {
                    "email": user_email
                },
                "external_reference": external_reference,
                "payment_methods": {
                    "excluded_payment_types": [],
                    "installments": 1
                },
                "back_urls": {
                    "success": f"{os.environ.get('FRONTEND_URL', '')}/payment/success",
                    "failure": f"{os.environ.get('FRONTEND_URL', '')}/payment/failure",
                    "pending": f"{os.environ.get('FRONTEND_URL', '')}/payment/pending"
                },
                "auto_return": "approved"
            }
            
            if notification_url:
                preference_data["notification_url"] = notification_url
            
            preference_response = self.sdk.preference().create(preference_data)
            
            if preference_response["status"] == 201:
                return {
                    "success": True,
                    "preference_id": preference_response["response"]["id"],
                    "init_point": preference_response["response"]["init_point"],
                    "sandbox_init_point": preference_response["response"]["sandbox_init_point"]
                }
            else:
                logger.error(f"Error creating preference: {preference_response}")
                return {"success": False, "error": preference_response}
                
        except Exception as e:
            logger.error(f"Exception creating preference: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """Get payment details by payment ID"""
        try:
            payment_response = self.sdk.payment().get(payment_id)
            
            if payment_response["status"] == 200:
                payment_data = payment_response["response"]
                return {
                    "success": True,
                    "payment": {
                        "id": payment_data.get("id"),
                        "status": payment_data.get("status"),
                        "status_detail": payment_data.get("status_detail"),
                        "amount": payment_data.get("transaction_amount"),
                        "currency": payment_data.get("currency_id"),
                        "external_reference": payment_data.get("external_reference"),
                        "date_created": payment_data.get("date_created"),
                        "date_approved": payment_data.get("date_approved"),
                        "payment_method": payment_data.get("payment_method_id"),
                        "payer_email": payment_data.get("payer", {}).get("email")
                    }
                }
            else:
                return {"success": False, "error": payment_response}
                
        except Exception as e:
            logger.error(f"Exception getting payment: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def create_refund(self, payment_id: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """Create a refund for a payment"""
        try:
            refund_data = {}
            if amount:
                refund_data["amount"] = amount
            
            refund_response = self.sdk.refund().create(payment_id, refund_data)
            
            if refund_response["status"] == 201:
                return {
                    "success": True,
                    "refund": refund_response["response"]
                }
            else:
                return {"success": False, "error": refund_response}
                
        except Exception as e:
            logger.error(f"Exception creating refund: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        """Verify webhook signature for security"""
        try:
            expected_signature = hmac.new(
                secret.encode(),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False
    
    async def process_webhook_payment(self, payment_id: str) -> Dict[str, Any]:
        """Process payment webhook notification"""
        payment_info = await self.get_payment(payment_id)
        
        if payment_info["success"]:
            payment = payment_info["payment"]
            
            # Map MercadoPago status to our internal status
            status_mapping = {
                "approved": "completed",
                "pending": "pending",
                "rejected": "failed",
                "cancelled": "cancelled",
                "refunded": "refunded"
            }
            
            internal_status = status_mapping.get(payment["status"], "unknown")
            
            return {
                "success": True,
                "payment_id": payment["id"],
                "external_reference": payment["external_reference"],
                "status": internal_status,
                "amount": payment["amount"],
                "currency": payment["currency"],
                "processed_at": datetime.utcnow()
            }
        
        return payment_info

# Utility functions
def get_mp_service(access_token: str = None) -> Optional[MercadoPagoService]:
    """Get MercadoPago service instance"""
    if not access_token:
        access_token = os.environ.get("MERCADOPAGO_ACCESS_TOKEN")
    
    if not access_token:
        logger.error("MercadoPago access token not configured")
        return None
    
    return MercadoPagoService(access_token)