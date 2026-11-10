package com.pakkachittha.app.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pakkachittha.app.ui.theme.*

@Composable
fun InvoiceStatusBadge(status: String, modifier: Modifier = Modifier) {
    val (bgColor, textColor, label) = when (status.uppercase()) {
        "PAID" -> Triple(BrandSuccessLight, BrandSuccess, "Paid")
        "PARTIAL", "PARTIALLY_PAID" -> Triple(BrandWarningLight, BrandWarning, "Partial")
        "OVERDUE" -> Triple(BrandDangerLight, BrandDanger, "Overdue")
        "UNPAID", "SENT" -> Triple(BrandAccentLight, BrandAccent, "Unpaid")
        "DRAFT" -> Triple(SurfaceSubtle, TextSecondary, "Draft")
        else -> Triple(SurfaceSubtle, TextSecondary, status)
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(8.dp),
        modifier = modifier
    ) {
        Text(
            text = label,
            color = textColor,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

